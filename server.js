import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";


dotenv.config();

const app = express();
// CORS aberto provisório para facilitar o deploy (ajustar depois)
app.use(cors({ origin: "*" }));
app.use(express.json());


const LOG_REQUESTS = (process.env.LOG_REQUESTS || '').toLowerCase() === 'true';
if (LOG_REQUESTS) {
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[req] ${req.method} ${req.path}`, { query: req.query, body: req.body });
    }
    next();
  });
}

const { DATABASE_URL } = process.env;
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;
try {
  if (DATABASE_URL) {
    const u = new URL(DATABASE_URL);
    console.log('DB connection target:', { user: u.username, host: u.hostname, port: u.port, database: u.pathname.replace('/', '') });
  } else {
    console.log('DB connection target: no DATABASE_URL set');
  }
} catch {
  // ignore
}

// ===== Arquivos estáticos de upload =====
const uploadRoot = path.resolve(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
} catch { }
app.use('/uploads', express.static(uploadRoot));

// Configuração do multer para uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base = path.basename(file.originalname || 'file', ext).replace(/[^a-z0-9-_]/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({ storage });

// Fallback de desenvolvimento quando o banco não está acessível
const memory = {
  empreendimentos: [],
  unidades_empreendimento: [],
  usuarios: [],
  diarios_obra: [],
  vistorias_terminalidade: [],
  usuarios_empreendimentos: [], // { user_id, empreendimento_id }
};
let memoryIdSeq = 1;

// Helper: detectar erros comuns de DB para resposta vazia em listas
function shouldReturnEmptyOnDbError(err) {
  const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
  const msg = err instanceof Error ? err.message : String(err);

  // Common cases: missing relation, auth failed
  if (code === '42P01' || code === '28P01') return true;
  // Also treat typical schema/constraint issues as non-fatal during dev fallback
  if (code === '23502' /* not_null_violation */) return true;
  if (code === '23503' /* foreign_key_violation */) return true;
  if (code === '42703' /* undefined_column */) return true;
  if (code === '22P02' /* invalid_text_representation */) return true;
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') return true;
  if (msg.includes('relation') && msg.includes('does not exist')) return true;
  if (msg.toLowerCase().includes('password authentication failed')) return true;
  if (msg.includes('DATABASE_URL not set')) return true;
  if (msg.toLowerCase().includes('connect') && msg.toLowerCase().includes('refused')) return true;
  return false;
}

// Util: normaliza strings de data para formato YYYY-MM-DD (aceita 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss')
function normalizeDate(date) {
  if (!date) return null;
  try {
    const s = String(date);
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// ====== Auth helpers (JWT HS256 + PBKDF2) ======
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signToken(payload, expiresInSeconds = 60 * 60 * 8) { // 8h default
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(body));
  const data = `${headerB64}.${payloadB64}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${signature}`;
}
function verifyToken(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const data = `${h}.${p}`;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (s !== expected) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(':');
    const candidate = crypto.pbkdf2Sync(String(password), salt, 100000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return next();
  const payload = verifyToken(token);
  if (!payload) return next();
  req.user = payload; // { sub, email, nome, role }
  next();
}
app.use(authMiddleware);

// ===== Auth routes =====
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nome } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });
    // Registro público sempre cria cliente; promoção para admin é feita via endpoint de admin
    const role = 'cliente';
    const perfil_cliente = true;
    // Try DB first
    try {
      const p = requirePool();
      const { rows } = await p.query('SELECT id FROM public.usuarios WHERE email = $1', [String(email)]);
      if (rows.length) return res.status(409).json({ error: 'email_exists' });
      const passHash = hashPassword(password);
      // Caso a coluna perfil_cliente não exista, manter somente role
      let id;
      try {
        const insert = await p.query('INSERT INTO public.usuarios (email, nome, password_hash, role, perfil_cliente, perfil) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [String(email), String(nome || ''), passHash, role, perfil_cliente, {}]);
        id = insert.rows[0].id;
      } catch (errInsert) {
        const insert2 = await p.query('INSERT INTO public.usuarios (email, nome, password_hash, role, perfil) VALUES ($1,$2,$3,$4,$5) RETURNING id', [String(email), String(nome || ''), passHash, role, {}]);
        id = insert2.rows[0].id;
      }
      const token = signToken({ sub: id, email: String(email), nome: String(nome || ''), role });
      return res.status(201).json({ token, user: { id, email, nome: nome || '', role } });
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      // Fallback memory
      if (memory.usuarios.find(u => u.email === String(email))) return res.status(409).json({ error: 'email_exists' });
      const id = ++memoryIdSeq;
      memory.usuarios.push({ id, email: String(email), nome: String(nome || ''), password_hash: hashPassword(password), role, perfil_cliente, perfil: {} });
      const token = signToken({ sub: id, email: String(email), nome: String(nome || ''), role });
      return res.status(201).json({ token, user: { id, email, nome: nome || '', role } });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });
    try {
      const p = requirePool();
      const { rows } = await p.query('SELECT id, email, nome, password_hash, role, perfil_cliente FROM public.usuarios WHERE email = $1', [String(email)]);
      if (!rows.length) return res.status(401).json({ error: 'invalid_credentials' });
      const u = rows[0];
      if (!verifyPassword(password, u.password_hash)) return res.status(401).json({ error: 'invalid_credentials' });
      const finalRole = (u.role === 'admin') ? 'admin' : ((u.role === 'cliente' || u.perfil_cliente === true) ? 'cliente' : 'user');
      const token = signToken({ sub: u.id, email: u.email, nome: u.nome || '', role: finalRole });
      return res.json({ token, user: { id: u.id, email: u.email, nome: u.nome || '', role: finalRole, perfil_cliente: finalRole === 'cliente' } });
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      const u = memory.usuarios.find(x => x.email === String(email));
      if (!u || !verifyPassword(password, u.password_hash)) return res.status(401).json({ error: 'invalid_credentials' });
      const finalRole = (u.role === 'admin') ? 'admin' : ((u.role === 'cliente' || u.perfil_cliente === true) ? 'cliente' : 'user');
      const token = signToken({ sub: u.id, email: u.email, nome: u.nome || '', role: finalRole });
      return res.json({ token, user: { id: u.id, email: u.email, nome: u.nome || '', role: finalRole, perfil_cliente: finalRole === 'cliente' } });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  const email = String(req.user.email || '');
  try {
    const p = requirePool();
    const { rows } = await p.query('SELECT id, email, nome, role, perfil_cliente, perfil FROM public.usuarios WHERE email = $1', [email]);
    if (!rows.length) return res.json({ id: req.user.sub, email, nome: req.user.nome || '', role: req.user.role || 'user', perfil_cliente: (req.user.role || '') === 'cliente' });
    const u = rows[0];
    const finalRole = (u.role === 'admin') ? 'admin' : ((u.role === 'cliente' || u.perfil_cliente === true) ? 'cliente' : 'user');
    // buscar vínculos
    let vinculos = [];
    try {
      const rel = await p.query('SELECT empreendimento_id FROM public.usuarios_empreendimentos WHERE user_id = $1', [u.id]);
      vinculos = rel.rows.map(r => r.empreendimento_id);
    } catch (e) {
      // fallback para perfil json
      try {
        if (u.perfil && typeof u.perfil === 'object' && Array.isArray(u.perfil.empreendimentos_vinculados)) {
          vinculos = u.perfil.empreendimentos_vinculados.map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v));
        }
      } catch { }
    }
    return res.json({ id: u.id, email: u.email, nome: u.nome || '', role: finalRole, perfil_cliente: finalRole === 'cliente', empreendimentos_vinculados: vinculos });
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    // Fallback memória
    const m = memory.usuarios.find(x => x.email === email);
    if (!m) return res.json({ id: req.user.sub, email, nome: req.user.nome || '', role: req.user.role || 'user', perfil_cliente: (req.user.role || '') === 'cliente' });
    const finalRole = (m.role === 'admin') ? 'admin' : ((m.role === 'cliente' || m.perfil_cliente === true) ? 'cliente' : 'user');
    const vinculos = Array.isArray((m.perfil || {}).empreendimentos_vinculados) ? (m.perfil.empreendimentos_vinculados || []).map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v)) : [];
    return res.json({ id: m.id, email: m.email, nome: m.nome || '', role: finalRole, perfil_cliente: finalRole === 'cliente', empreendimentos_vinculados: vinculos });
  }
});

// Util: garante string JSON válida para colunas jsonb
function toJson(v) {
  try {
    if (v === undefined || v === null) return null;
    return JSON.stringify(v);
  } catch {
    return 'null';
  }
}

// Healthcheck disponível em /health e /api/health
app.get("/health", async (_req, res) => {
  try {
    if (!pool) {
      return res.json({ status: "ok", db: { ok: false, message: "DATABASE_URL not set" } });
    }
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: { ok: true, value: result.rows[0].ok } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    res.status(500).json({ status: "error", error: msg, code });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    if (!pool) {
      return res.json({ status: "ok", db: { ok: false, message: "DATABASE_URL not set" } });
    }
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: { ok: true, value: result.rows[0].ok } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    res.status(500).json({ status: "error", error: msg, code });
  }
});

// Root endpoint to avoid "Cannot GET /"
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'fitout-backend' });
});

// Helper to ensure pool exists
function requirePool() {
  if (!pool) throw new Error("DATABASE_URL not set");
  return pool;
}

// Upload de arquivo: retorna URL pública em /uploads
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'missing_file' });
    const port = Number(process.env.PORT ?? 3000);
    const filePath = `/uploads/${req.file.filename}`;
    const file_url = `http://localhost:${port}${filePath}`;
    res.status(201).json({ file_url, path: filePath, name: req.file.originalname, size: req.file.size });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Map DB row to API payload
function mapRelatorioRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    numero_relatorio: row.numero_relatorio,
    nome_arquivo: row.nome_arquivo,
    data_inicio_semana: row.data_inicio_semana,
    data_fim_semana: row.data_fim_semana,
    fisico_real_total: row.fisico_real_total,
    efetivo: row.efetivo,
    avanco_fisico_acumulado: row.avanco_fisico_acumulado,
    avanco_financeiro_acumulado: row.avanco_financeiro_acumulado,
    principais_atividades_semana: row.principais_atividades_semana,
    atividades_proxima_semana_tabela: row.atividades_proxima_semana_tabela,
    caminho_critico: row.caminho_critico,
    impedimentos: row.impedimentos,
    fotos: row.fotos,
    vistos: row.vistos,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Normalize order param
function buildOrderClause(order) {
  if (!order) return 'ORDER BY created_at DESC';
  const field = order.replace(/^[-+]/, '');
  const dir = order.startsWith('-') ? 'DESC' : 'ASC';
  // allow both created_date and created_at for compatibility
  const col = field === 'created_date' ? 'created_at' : field;
  const allowed = new Set(['created_at', 'data_inicio_semana', 'data_fim_semana', 'numero_relatorio', 'id', 'data_inspecao', 'revisao']);
  return `ORDER BY ${allowed.has(col) ? col : 'created_at'} ${dir}`;
}

// CRUD routes for relatorios semanais
app.get('/api/relatorios-semanais', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.relatorios_semanais ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapRelatorioRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Map vistoria row
function mapVistoriaRow(row) {
  return {
    id: row.id,
    id_formulario: row.id_formulario,
    id_unidade: row.id_unidade,
    id_empreendimento: row.id_empreendimento,
    estrutura_formulario: row.estrutura_formulario,
    nome_vistoria: row.nome_vistoria,
    nome_arquivo: row.nome_arquivo,
    data_vistoria: row.data_vistoria,
    data_relatorio: row.data_relatorio,
    consultor_responsavel: row.consultor_responsavel,
    participantes: row.participantes,
    texto_os_proposta: row.texto_os_proposta,
    texto_escopo_consultoria: row.texto_escopo_consultoria,
    respostas: row.respostas,
    fotos_secoes: row.fotos_secoes,
    status_vistoria: row.status_vistoria,
    observacoes_secoes: row.observacoes_secoes,
    pontuacao_total: row.pontuacao_total,
    pontuacao_maxima: row.pontuacao_maxima,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// CRUD routes for vistorias (respostas_vistoria)
app.get('/api/vistorias', async (req, res) => {
  try {
    const p = requirePool();
    const { id_unidade, id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_unidade) { where.push('id_unidade = $' + (params.length + 1)); params.push(Number(id_unidade)); }
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.respostas_vistoria ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapVistoriaRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/vistorias/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.respostas_vistoria WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapVistoriaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/vistorias', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    // Se for uma vistoria avulsa (sem id_formulario) mas com estrutura presente,
    // criar um formulário automaticamente para satisfazer a FK NOT NULL.
    let formularioId = b.id_formulario ?? (b.unidade_id ?? b.id_unidade ? null : null);
    if (!formularioId && Array.isArray(b.estrutura_formulario) && b.estrutura_formulario.length > 0) {
      const nomeAuto = `Avulso - ${b.nome_vistoria ?? 'Vistoria'}`;
      const sqlForm = `INSERT INTO public.formularios_vistoria (
        nome_formulario, descricao_formulario, status_formulario, secoes
      ) VALUES ($1,$2,$3,$4) RETURNING id`;
      const paramsForm = [
        nomeAuto,
        'Gerado automaticamente para vistoria avulsa',
        'Ativo',
        toJson(b.estrutura_formulario)
      ];
      const formRes = await p.query(sqlForm, paramsForm);
      formularioId = formRes.rows[0].id;
    }
    const sql = `INSERT INTO public.respostas_vistoria (
      id_formulario, id_unidade, id_empreendimento, estrutura_formulario, nome_vistoria, nome_arquivo,
      data_vistoria, data_relatorio, consultor_responsavel, participantes, texto_os_proposta,
      texto_escopo_consultoria, respostas, fotos_secoes, status_vistoria, observacoes_secoes,
      pontuacao_total, pontuacao_maxima
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
    ) RETURNING *`;
    const participantesArr = Array.isArray(b.participantes)
      ? b.participantes
      : (typeof b.participantes === 'string'
        ? b.participantes.split(',').map(s => s.trim()).filter(Boolean)
        : []);
    const params = [
      formularioId ?? b.id_formulario, b.unidade_id ?? b.id_unidade, b.empreendimento_id ?? b.id_empreendimento, toJson(b.estrutura_formulario ?? null), b.nome_vistoria ?? null, b.nome_arquivo ?? null,
      normalizeDate(b.data_vistoria) ?? null, normalizeDate(b.data_relatorio) ?? null, b.consultor_responsavel ?? null, toJson(participantesArr), b.texto_os_proposta ?? null,
      b.texto_escopo_consultoria ?? null, toJson(b.respostas ?? {}), toJson(b.fotos_secoes ?? []), b.status_vistoria ?? 'Em Andamento', toJson(b.observacoes_secoes ?? {}),
      b.pontuacao_total ?? null, b.pontuacao_maxima ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapVistoriaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});
app.get('/api/relatorios-semanais/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.relatorios_semanais WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRelatorioRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/relatorios-semanais', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.relatorios_semanais (
      id_empreendimento, numero_relatorio, nome_arquivo, data_inicio_semana, data_fim_semana,
      fisico_real_total, efetivo, avanco_fisico_acumulado, avanco_financeiro_acumulado,
      principais_atividades_semana, atividades_proxima_semana_tabela, caminho_critico,
      impedimentos, fotos, vistos
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
    ) RETURNING *`;
    const params = [
      b.id_empreendimento, b.numero_relatorio, b.nome_arquivo, b.data_inicio_semana, b.data_fim_semana,
      b.fisico_real_total ?? null, b.efetivo ?? null, b.avanco_fisico_acumulado ?? null, b.avanco_financeiro_acumulado ?? null,
      b.principais_atividades_semana ?? null, b.atividades_proxima_semana_tabela ?? null, b.caminho_critico ?? null,
      b.impedimentos ?? null, b.fotos ?? null, b.vistos ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapRelatorioRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Inspeções de Hidrantes =====
function mapInspecaoHidrantesRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: row.data_inspecao,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    itens_documentacao: row.itens_documentacao,
    comentarios_documentacao: row.comentarios_documentacao,
    locais: row.locais,
    observacoes_gerais: row.observacoes_gerais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Listar/filtrar
app.get('/api/inspecoes-hidrantes', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_hidrantes ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoHidrantesRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

// Obter por ID
app.get('/api/inspecoes-hidrantes/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_hidrantes WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoHidrantesRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Criar
app.post('/api/inspecoes-hidrantes', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    console.log('[POST /api/inspecoes-hidrantes] body:', JSON.stringify(b).slice(0, 2000));
    // Verifica existência do empreendimento para evitar violação de FK
    const empId = Number(b.id_empreendimento);
    try {
      const chk = await p.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [empId]);
      if (!chk.rows.length) {
        return res.status(400).json({ error: 'invalid_empreendimento', id: empId });
      }
    } catch (e) {
      // Se o schema ainda não estiver criado, retorna vazio para não quebrar a UI
      if (shouldReturnEmptyOnDbError(e)) return res.status(500).json({ error: 'db_unavailable' });
      throw e;
    }
    const sql = `INSERT INTO public.inspecoes_hidrantes (
      id_empreendimento, data_inspecao, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, itens_documentacao, comentarios_documentacao,
      locais, observacoes_gerais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12,$13::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      b.comentarios_documentacao ?? null,
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoHidrantesRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-hidrantes] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

// Atualizar
app.put('/api/inspecoes-hidrantes/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_hidrantes SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      titulo_relatorio = $3,
      subtitulo_relatorio = $4,
      cliente = $5,
      revisao = $6,
      eng_responsavel = $7,
      nome_arquivo = $8,
      itens_documentacao = $9::jsonb,
      comentarios_documentacao = $10,
      locais = $11::jsonb,
      observacoes_gerais = $12,
      assinaturas = $13::jsonb,
      updated_at = now()
    WHERE id = $14 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      b.comentarios_documentacao ?? null,
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoHidrantesRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-hidrantes/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

// Remover
app.delete('/api/inspecoes-hidrantes/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_hidrantes WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Inspeções de Sprinklers =====
function mapInspecaoSprinklersRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: row.data_inspecao,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    itens_documentacao: row.itens_documentacao,
    locais: row.locais,
    observacoes_gerais: row.observacoes_gerais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/inspecoes-sprinklers', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_sprinklers ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoSprinklersRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-sprinklers/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_sprinklers WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoSprinklersRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-sprinklers', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    const empId = Number(b.id_empreendimento);
    try {
      const chk = await p.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [empId]);
      if (!chk.rows.length) {
        return res.status(400).json({ error: 'invalid_empreendimento', id: empId });
      }
    } catch (e) {
      if (shouldReturnEmptyOnDbError(e)) return res.status(500).json({ error: 'db_unavailable' });
      throw e;
    }
    const sql = `INSERT INTO public.inspecoes_sprinklers (
      id_empreendimento, data_inspecao, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, itens_documentacao, locais, observacoes_gerais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoSprinklersRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-sprinklers] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-sprinklers/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_sprinklers SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      titulo_relatorio = $3,
      subtitulo_relatorio = $4,
      cliente = $5,
      revisao = $6,
      eng_responsavel = $7,
      nome_arquivo = $8,
      itens_documentacao = $9::jsonb,
      locais = $10::jsonb,
      observacoes_gerais = $11,
      assinaturas = $12::jsonb,
      updated_at = now()
    WHERE id = $13 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoSprinklersRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-sprinklers/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-sprinklers/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_sprinklers WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Inspeções de Alarme de Incêndio =====
function mapInspecaoAlarmeRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: row.data_inspecao,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    itens_documentacao: row.itens_documentacao,
    locais: row.locais,
    observacoes_gerais: row.observacoes_gerais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/inspecoes-alarme-incendio', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_alarme_incendio ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoAlarmeRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-alarme-incendio/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_alarme_incendio WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoAlarmeRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-alarme-incendio', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    const empId = Number(b.id_empreendimento);
    try {
      const chk = await p.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [empId]);
      if (!chk.rows.length) {
        return res.status(400).json({ error: 'invalid_empreendimento', id: empId });
      }
    } catch (e) {
      if (shouldReturnEmptyOnDbError(e)) return res.status(500).json({ error: 'db_unavailable' });
      throw e;
    }
    const sql = `INSERT INTO public.inspecoes_alarme_incendio (
      id_empreendimento, data_inspecao, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, itens_documentacao, locais, observacoes_gerais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoAlarmeRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-alarme-incendio] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-alarme-incendio/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_alarme_incendio SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      titulo_relatorio = $3,
      subtitulo_relatorio = $4,
      cliente = $5,
      revisao = $6,
      eng_responsavel = $7,
      nome_arquivo = $8,
      itens_documentacao = $9::jsonb,
      locais = $10::jsonb,
      observacoes_gerais = $11,
      assinaturas = $12::jsonb,
      updated_at = now()
    WHERE id = $13 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoAlarmeRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-alarme-incendio/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-alarme-incendio/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_alarme_incendio WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Inspeções de Ar Condicionado =====
function mapInspecaoArRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: row.data_inspecao,
    projeto: row.projeto,
    data_projeto: row.data_projeto,
    titulo_secao_inspecao: row.titulo_secao_inspecao,
    evaporadoras: row.evaporadoras,
    condensadoras: row.condensadoras,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    itens_documentacao: row.itens_documentacao,
    comentarios_documentacao: row.comentarios_documentacao,
    inspecao_evaporadora: row.inspecao_evaporadora,
    inspecao_valvulas: row.inspecao_valvulas,
    inspecao_condensadora: row.inspecao_condensadora,
    inspecao_eletrica: row.inspecao_eletrica,
    inspecao_sensores: row.inspecao_sensores,
    locais: row.locais,
    observacoes_gerais: row.observacoes_gerais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/inspecoes-ar-condicionado', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_ar_condicionado ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoArRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-ar-condicionado/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_ar_condicionado WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoArRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-ar-condicionado', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    const empId = Number(b.id_empreendimento);
    try {
      const chk = await p.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [empId]);
      if (!chk.rows.length) {
        return res.status(400).json({ error: 'invalid_empreendimento', id: empId });
      }
    } catch (e) {
      if (shouldReturnEmptyOnDbError(e)) return res.status(500).json({ error: 'db_unavailable' });
      throw e;
    }
    const sql = `INSERT INTO public.inspecoes_ar_condicionado (
      id_empreendimento, data_inspecao, projeto, data_projeto, titulo_secao_inspecao,
      evaporadoras, condensadoras, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, itens_documentacao, comentarios_documentacao,
      inspecao_evaporadora, inspecao_valvulas, inspecao_condensadora, inspecao_eletrica, inspecao_sensores,
      locais, observacoes_gerais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,$21,$22::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? null,
      b.projeto ?? null,
      normalizeDate(b.data_projeto) ?? null,
      b.titulo_secao_inspecao ?? null,
      toJson(b.evaporadoras ?? []),
      toJson(b.condensadoras ?? []),
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      b.comentarios_documentacao ?? null,
      toJson(b.inspecao_evaporadora ?? []),
      toJson(b.inspecao_valvulas ?? []),
      toJson(b.inspecao_condensadora ?? []),
      toJson(b.inspecao_eletrica ?? []),
      toJson(b.inspecao_sensores ?? []),
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoArRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-ar-condicionado] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-ar-condicionado/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_ar_condicionado SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      projeto = $3,
      data_projeto = $4,
      titulo_secao_inspecao = $5,
      evaporadoras = $6::jsonb,
      condensadoras = $7::jsonb,
      titulo_relatorio = $8,
      subtitulo_relatorio = $9,
      cliente = $10,
      revisao = $11,
      eng_responsavel = $12,
      nome_arquivo = $13,
      itens_documentacao = $14::jsonb,
      comentarios_documentacao = $15,
      inspecao_evaporadora = $16::jsonb,
      inspecao_valvulas = $17::jsonb,
      inspecao_condensadora = $18::jsonb,
      inspecao_eletrica = $19::jsonb,
      inspecao_sensores = $20::jsonb,
      locais = $21::jsonb,
      observacoes_gerais = $22,
      assinaturas = $23::jsonb,
      updated_at = now()
    WHERE id = $24 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.projeto ?? null,
      normalizeDate(b.data_projeto) ?? null,
      b.titulo_secao_inspecao ?? null,
      toJson(b.evaporadoras ?? []),
      toJson(b.condensadoras ?? []),
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      b.comentarios_documentacao ?? null,
      toJson(b.inspecao_evaporadora ?? []),
      toJson(b.inspecao_valvulas ?? []),
      toJson(b.inspecao_condensadora ?? []),
      toJson(b.inspecao_eletrica ?? []),
      toJson(b.inspecao_sensores ?? []),
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoArRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-ar-condicionado/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-ar-condicionado/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_ar_condicionado WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Inspeções de Controle de Acesso =====
function mapInspecaoCAcessoRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: row.data_inspecao,
    projeto: row.projeto,
    data_projeto: row.data_projeto,
    titulo_secao_inspecao: row.titulo_secao_inspecao,
    label_local: row.label_local,
    equipamentos: row.equipamentos,
    info_sistema: row.info_sistema,
    info_sistema_labels: row.info_sistema_labels,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    itens_documentacao: row.itens_documentacao,
    locais: row.locais,
    observacoes_gerais: row.observacoes_gerais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/inspecoes-controle-acesso', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_controle_acesso ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoCAcessoRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-controle-acesso/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_controle_acesso WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoCAcessoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-controle-acesso', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    const empId = Number(b.id_empreendimento);
    try {
      const chk = await p.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [empId]);
      if (!chk.rows.length) {
        return res.status(400).json({ error: 'invalid_empreendimento', id: empId });
      }
    } catch (e) {
      if (shouldReturnEmptyOnDbError(e)) return res.status(500).json({ error: 'db_unavailable' });
      throw e;
    }
    const sql = `INSERT INTO public.inspecoes_controle_acesso (
      id_empreendimento, data_inspecao, projeto, data_projeto, titulo_secao_inspecao, label_local,
      equipamentos, info_sistema, info_sistema_labels, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, itens_documentacao, locais, observacoes_gerais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? null,
      b.projeto ?? null,
      normalizeDate(b.data_projeto) ?? null,
      b.titulo_secao_inspecao ?? null,
      b.label_local ?? null,
      toJson(b.equipamentos ?? []),
      toJson(b.info_sistema ?? []),
      toJson(b.info_sistema_labels ?? []),
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoCAcessoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-controle-acesso] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-controle-acesso/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_controle_acesso SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      projeto = $3,
      data_projeto = $4,
      titulo_secao_inspecao = $5,
      label_local = $6,
      equipamentos = $7::jsonb,
      info_sistema = $8::jsonb,
      info_sistema_labels = $9::jsonb,
      titulo_relatorio = $10,
      subtitulo_relatorio = $11,
      cliente = $12,
      revisao = $13,
      eng_responsavel = $14,
      itens_documentacao = $15::jsonb,
      locais = $16::jsonb,
      observacoes_gerais = $17,
      assinaturas = $18::jsonb,
      updated_at = now()
    WHERE id = $19 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.projeto ?? null,
      normalizeDate(b.data_projeto) ?? null,
      b.titulo_secao_inspecao ?? null,
      b.label_local ?? null,
      toJson(b.equipamentos ?? []),
      toJson(b.info_sistema ?? []),
      toJson(b.info_sistema_labels ?? []),
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.locais ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoCAcessoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-controle-acesso/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-controle-acesso/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_controle_acesso WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Inspeções de CFTV =====
function mapInspecaoCFTVRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: row.data_inspecao,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    itens_documentacao: row.itens_documentacao,
    info_sistema: row.info_sistema,
    info_cameras: row.info_cameras,
    pavimentos: row.pavimentos,
    observacoes_gerais: row.observacoes_gerais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/inspecoes-cftv', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_cftv ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoCFTVRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-cftv/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_cftv WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoCFTVRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-cftv', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    const empId = Number(b.id_empreendimento);
    try {
      const chk = await p.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [empId]);
      if (!chk.rows.length) {
        return res.status(400).json({ error: 'invalid_empreendimento', id: empId });
      }
    } catch (e) {
      if (shouldReturnEmptyOnDbError(e)) return res.status(500).json({ error: 'db_unavailable' });
      throw e;
    }
    const sql = `INSERT INTO public.inspecoes_cftv (
      id_empreendimento, data_inspecao, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, itens_documentacao, info_sistema, info_cameras, pavimentos,
      observacoes_gerais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.info_sistema ?? []),
      toJson(b.info_cameras ?? []),
      toJson(b.pavimentos ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoCFTVRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-cftv] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-cftv/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_cftv SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      titulo_relatorio = $3,
      subtitulo_relatorio = $4,
      cliente = $5,
      revisao = $6,
      eng_responsavel = $7,
      nome_arquivo = $8,
      itens_documentacao = $9::jsonb,
      info_sistema = $10::jsonb,
      info_cameras = $11::jsonb,
      pavimentos = $12::jsonb,
      observacoes_gerais = $13,
      assinaturas = $14::jsonb,
      updated_at = now()
    WHERE id = $15 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.info_sistema ?? []),
      toJson(b.info_cameras ?? []),
      toJson(b.pavimentos ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoCFTVRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-cftv/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-cftv/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_cftv WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Inspeções de SDAI =====
function mapInspecaoSDAIRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: row.data_inspecao,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    itens_documentacao: row.itens_documentacao,
    centrais: row.centrais,
    instalacoes: row.instalacoes,
    ordem_secoes: row.ordem_secoes,
    itens_instalacao: row.itens_instalacao,
    comentarios_instalacao: row.comentarios_instalacao,
    observacoes_gerais: row.observacoes_gerais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/inspecoes-sdai', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_sdai ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoSDAIRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-sdai/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_sdai WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoSDAIRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-sdai', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    const empId = Number(b.id_empreendimento);
    try {
      const chk = await p.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [empId]);
      if (!chk.rows.length) {
        return res.status(400).json({ error: 'invalid_empreendimento', id: empId });
      }
    } catch (e) {
      if (shouldReturnEmptyOnDbError(e)) return res.status(500).json({ error: 'db_unavailable' });
      throw e;
    }
    const sql = `INSERT INTO public.inspecoes_sdai (
      id_empreendimento, data_inspecao, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, itens_documentacao, centrais, instalacoes, ordem_secoes,
      itens_instalacao, comentarios_instalacao, observacoes_gerais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15,$16::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.centrais ?? []),
      toJson(b.instalacoes ?? []),
      toJson(b.ordem_secoes ?? []),
      toJson(b.itens_instalacao ?? []),
      b.comentarios_instalacao ?? null,
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoSDAIRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-sdai] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-sdai/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_sdai SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      titulo_relatorio = $3,
      subtitulo_relatorio = $4,
      cliente = $5,
      revisao = $6,
      eng_responsavel = $7,
      nome_arquivo = $8,
      itens_documentacao = $9::jsonb,
      centrais = $10::jsonb,
      instalacoes = $11::jsonb,
      ordem_secoes = $12::jsonb,
      itens_instalacao = $13::jsonb,
      comentarios_instalacao = $14,
      observacoes_gerais = $15,
      assinaturas = $16::jsonb,
      updated_at = now()
    WHERE id = $17 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      toJson(b.itens_documentacao ?? []),
      toJson(b.centrais ?? []),
      toJson(b.instalacoes ?? []),
      toJson(b.ordem_secoes ?? []),
      toJson(b.itens_instalacao ?? []),
      b.comentarios_instalacao ?? null,
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoSDAIRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-sdai/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-sdai/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_sdai WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.put('/api/relatorios-semanais/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.relatorios_semanais SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      numero_relatorio = COALESCE($2, numero_relatorio),
      nome_arquivo = COALESCE($3, nome_arquivo),
      data_inicio_semana = COALESCE($4, data_inicio_semana),
      data_fim_semana = COALESCE($5, data_fim_semana),
      fisico_real_total = COALESCE($6, fisico_real_total),
      efetivo = COALESCE($7, efetivo),
      avanco_fisico_acumulado = COALESCE($8, avanco_fisico_acumulado),
      avanco_financeiro_acumulado = COALESCE($9, avanco_financeiro_acumulado),
      principais_atividades_semana = COALESCE($10, principais_atividades_semana),
      atividades_proxima_semana_tabela = COALESCE($11, atividades_proxima_semana_tabela),
      caminho_critico = COALESCE($12, caminho_critico),
      impedimentos = COALESCE($13, impedimentos),
      fotos = COALESCE($14, fotos),
      vistos = COALESCE($15, vistos)
    WHERE id = $16 RETURNING *`;
    const params = [
      b.id_empreendimento ?? null, b.numero_relatorio ?? null, b.nome_arquivo ?? null, b.data_inicio_semana ?? null, b.data_fim_semana ?? null,
      b.fisico_real_total ?? null, b.efetivo ?? null, b.avanco_fisico_acumulado ?? null, b.avanco_financeiro_acumulado ?? null,
      b.principais_atividades_semana ?? null, b.atividades_proxima_semana_tabela ?? null, b.caminho_critico ?? null,
      b.impedimentos ?? null, b.fotos ?? null, b.vistos ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRelatorioRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.delete('/api/relatorios-semanais/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.relatorios_semanais WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ---- KO unidade (kos_unidade) ----
function mapKO(row) {
  return {
    id: row.id,
    id_unidade: row.id_unidade,
    item_ko: row.item_ko,
    descricao_ko: row.descricao_ok, // coluna no schema é descricao_ok
    comentario_ko: row.comentario_ko,
    replica_ko: row.replica_ko,
    treplica_ko: row.treplica_ko,
    imagem_ko: row.imagem_ko,
    comentario_im_ko: row.comentario_im_ko,
    disciplina_ko: row.disciplina_ko,
    status: row.status,
    data_inclusao_ko: row.data_inclusao_ko,
    emissao_ko: row.emissao_ko,
    data_reuniao: row.data_reuniao,
    hora_reuniao: row.hora_reuniao,
    participantes_interativa: row.participantes_interativa,
    participantes_condominio: row.participantes_condominio,
    participantes_locatario: row.participantes_locatario,
    os_numero: row.os_numero,
    empreendimento_gerenciador: row.empreendimento_gerenciador,
    torre_pavimento_conjunto: row.torre_pavimento_conjunto,
    metros_quadrados: row.metros_quadrados,
    escopo_servicos_interativa: row.escopo_servicos_interativa,
    escopo_servicos_locatario: row.escopo_servicos_locatario,
    data_envio_projetos: row.data_envio_projetos,
    data_inicio_atividades: row.data_inicio_atividades,
    data_previsao_ocupacao: row.data_previsao_ocupacao,
    particularidades: row.particularidades,
    outras_informacoes: row.outras_informacoes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/kos-unidade', async (req, res) => {
  try {
    const p = requirePool();
    const { id_unidade, status, order } = req.query;
    const where = [];
    const params = [];
    if (id_unidade) { where.push('id_unidade = $' + (params.length + 1)); params.push(Number(id_unidade)); }
    if (status) { where.push('status = $' + (params.length + 1)); params.push(String(status)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.kos_unidade ${whereClause} ${orderClause}`, params);
    res.json(rows.map(mapKO));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/kos-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.kos_unidade WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapKO(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/kos-unidade', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.kos_unidade (
      id_unidade, item_ko, descricao_ok, comentario_ko, replica_ko, treplica_ko,
      imagem_ko, comentario_im_ko, disciplina_ko, status, data_inclusao_ko, emissao_ko
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
    ) RETURNING *`;
    const params = [
      b.id_unidade, b.item_ko ?? null, b.descricao_ko ?? null, b.comentario_ko ?? null, b.replica_ko ?? null, b.treplica_ko ?? null,
      b.imagem_ko ?? null, b.comentario_im_ko ?? null, b.disciplina_ko ?? null, b.status ?? null, b.data_inclusao_ko ?? null, b.emissao_ko ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapKO(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/kos-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.kos_unidade SET
      id_unidade = COALESCE($1, id_unidade),
      item_ko = COALESCE($2, item_ko),
      descricao_ok = COALESCE($3, descricao_ok),
      comentario_ko = COALESCE($4, comentario_ko),
      replica_ko = COALESCE($5, replica_ko),
      treplica_ko = COALESCE($6, treplica_ko),
      imagem_ko = COALESCE($7, imagem_ko),
      comentario_im_ko = COALESCE($8, comentario_im_ko),
      disciplina_ko = COALESCE($9, disciplina_ko),
      status = COALESCE($10, status),
      data_inclusao_ko = COALESCE($11, data_inclusao_ko),
      emissao_ko = COALESCE($12, emissao_ko)
    WHERE id = $13 RETURNING *`;
    const params = [
      b.id_unidade ?? null, b.item_ko ?? null, b.descricao_ko ?? null, b.comentario_ko ?? null, b.replica_ko ?? null, b.treplica_ko ?? null,
      b.imagem_ko ?? null, b.comentario_im_ko ?? null, b.disciplina_ko ?? null, b.status ?? null, b.data_inclusao_ko ?? null, b.emissao_ko ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapKO(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/kos-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.kos_unidade WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- VO unidade (vos_unidade) ----
function mapVO(row) {
  return {
    id: row.id,
    id_unidade: row.id_unidade,
    item_vo: row.item_vo,
    descricao_vo: row.descricao_vo,
    comentario_vo: row.comentario_vo,
    replica_vo: row.replica_vo,
    treplica_vo: row.treplica_vo,
    imagem_vo: row.imagem_vo,
    comentario_im_vo: row.comentario_im_vo,
    disciplina_vo: row.disciplina_vo,
    status: row.status,
    data_inclusao_vo: row.data_inclusao_vo,
    emissao_vo: row.emissao_vo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/vos-unidade', async (req, res) => {
  try {
    const p = requirePool();
    const { id_unidade, status, order } = req.query;
    const where = [];
    const params = [];
    if (id_unidade) { where.push('id_unidade = $' + (params.length + 1)); params.push(Number(id_unidade)); }
    if (status) { where.push('status = $' + (params.length + 1)); params.push(String(status)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.vos_unidade ${whereClause} ${orderClause}`, params);
    res.json(rows.map(mapVO));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- AP unidade (aps_unidade) ----
function mapAP(row) {
  return {
    id: row.id,
    id_unidade: row.id_unidade,
    id_anterior: row.id_anterior,
    item_ap: row.item_ap,
    descricao_ap: row.descricao_ap,
    comentario_ap: row.comentario_ap,
    replica_ap: row.replica_ap,
    treplica_ap: row.treplica_ap,
    imagem_ap: row.imagem_ap,
    comentario_im_ap: row.comentario_im_ap,
    disciplina_ap: row.disciplina_ap,
    status: row.status,
    data_inclusao_ap: row.data_inclusao_ap,
    emissao_ap: row.emissao_ap,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/aps-unidade', async (req, res) => {
  try {
    const p = requirePool();
    const { id_unidade, status, order } = req.query;
    const where = [];
    const params = [];
    if (id_unidade) { where.push('id_unidade = $' + (params.length + 1)); params.push(Number(id_unidade)); }
    if (status) { where.push('status = $' + (params.length + 1)); params.push(String(status)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.aps_unidade ${whereClause} ${orderClause}`, params);
    res.json(rows.map(mapAP));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/aps-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.aps_unidade WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapAP(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/aps-unidade', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.aps_unidade (
      id_unidade, id_anterior, item_ap, descricao_ap, comentario_ap, replica_ap, treplica_ap,
      imagem_ap, comentario_im_ap, disciplina_ap, status, data_inclusao_ap, emissao_ap
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
    ) RETURNING *`;
    const params = [
      b.id_unidade, b.id_anterior ?? null, b.item_ap ?? null, b.descricao_ap ?? null, b.comentario_ap ?? null, b.replica_ap ?? null, b.treplica_ap ?? null,
      b.imagem_ap ?? null, b.comentario_im_ap ?? null, b.disciplina_ap ?? null, b.status ?? null, b.data_inclusao_ap ?? null, b.emissao_ap ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapAP(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/aps-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.aps_unidade SET
      id_unidade = COALESCE($1, id_unidade),
      id_anterior = COALESCE($2, id_anterior),
      item_ap = COALESCE($3, item_ap),
      descricao_ap = COALESCE($4, descricao_ap),
      comentario_ap = COALESCE($5, comentario_ap),
      replica_ap = COALESCE($6, replica_ap),
      treplica_ap = COALESCE($7, treplica_ap),
      imagem_ap = COALESCE($8, imagem_ap),
      comentario_im_ap = COALESCE($9, comentario_im_ap),
      disciplina_ap = COALESCE($10, disciplina_ap),
      status = COALESCE($11, status),
      data_inclusao_ap = COALESCE($12, data_inclusao_ap),
      emissao_ap = COALESCE($13, emissao_ap)
    WHERE id = $14 RETURNING *`;
    const params = [
      b.id_unidade ?? null, b.id_anterior ?? null, b.item_ap ?? null, b.descricao_ap ?? null, b.comentario_ap ?? null, b.replica_ap ?? null, b.treplica_ap ?? null,
      b.imagem_ap ?? null, b.comentario_im_ap ?? null, b.disciplina_ap ?? null, b.status ?? null, b.data_inclusao_ap ?? null, b.emissao_ap ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapAP(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/aps-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.aps_unidade WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/vos-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.vos_unidade WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapVO(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/vos-unidade', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.vos_unidade (
      id_unidade, item_vo, descricao_vo, comentario_vo, replica_vo, treplica_vo,
      imagem_vo, comentario_im_vo, disciplina_vo, status, data_inclusao_vo, emissao_vo
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
    ) RETURNING *`;
    const params = [
      b.id_unidade, b.item_vo ?? null, b.descricao_vo ?? null, b.comentario_vo ?? null, b.replica_vo ?? null, b.treplica_vo ?? null,
      b.imagem_vo ?? null, b.comentario_im_vo ?? null, b.disciplina_vo ?? null, b.status ?? null, b.data_inclusao_vo ?? null, b.emissao_vo ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapVO(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/vos-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.vos_unidade SET
      id_unidade = COALESCE($1, id_unidade),
      item_vo = COALESCE($2, item_vo),
      descricao_vo = COALESCE($3, descricao_vo),
      comentario_vo = COALESCE($4, comentario_vo),
      replica_vo = COALESCE($5, replica_vo),
      treplica_vo = COALESCE($6, treplica_vo),
      imagem_vo = COALESCE($7, imagem_vo),
      comentario_im_vo = COALESCE($8, comentario_im_vo),
      disciplina_vo = COALESCE($9, disciplina_vo),
      status = COALESCE($10, status),
      data_inclusao_vo = COALESCE($11, data_inclusao_vo),
      emissao_vo = COALESCE($12, emissao_vo)
    WHERE id = $13 RETURNING *`;
    const params = [
      b.id_unidade ?? null, b.item_vo ?? null, b.descricao_vo ?? null, b.comentario_vo ?? null, b.replica_vo ?? null, b.treplica_vo ?? null,
      b.imagem_vo ?? null, b.comentario_im_vo ?? null, b.disciplina_vo ?? null, b.status ?? null, b.data_inclusao_vo ?? null, b.emissao_vo ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapVO(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/vos-unidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.vos_unidade WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Diarios de Obra ----
function mapDiario(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    id_unidade: row.id_unidade,
    unidade_texto: row.unidade_texto,
    nome_arquivo: row.nome_arquivo,
    numero_diario: row.numero_diario,
    data_diario: row.data_diario,
    condicao_climatica: row.condicao_climatica,
    horas_paralisadas: row.horas_paralisadas,
    periodo_trabalhado: row.periodo_trabalhado,
    efetivo: row.efetivo,
    principais_atividades: row.principais_atividades,
    ocorrencias_observacoes: row.ocorrencias_observacoes,
    fotos: row.fotos,
    vistos: row.vistos,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/diarios-obra', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, id_unidade, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    if (id_unidade) { where.push('id_unidade = $' + (params.length + 1)); params.push(Number(id_unidade)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.diarios_obra ${whereClause} ${orderClause}`, params);
    if (rows.length === 0) {
      const { id_empreendimento, id_unidade } = req.query;
      let fallback = memory.diarios_obra || [];
      if (id_empreendimento) fallback = fallback.filter(d => Number(d.id_empreendimento) === Number(id_empreendimento));
      if (id_unidade) fallback = fallback.filter(d => Number(d.id_unidade) === Number(id_unidade));
      if (fallback.length > 0) return res.json(fallback);
    }
    res.json(rows.map(mapDiario));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const { id_empreendimento, id_unidade } = req.query;
    let data = memory.diarios_obra || [];
    if (id_empreendimento) data = data.filter(d => Number(d.id_empreendimento) === Number(id_empreendimento));
    if (id_unidade) data = data.filter(d => Number(d.id_unidade) === Number(id_unidade));
    res.json(data);
  }
});

app.get('/api/diarios-obra/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.diarios_obra WHERE id = $1', [id]);
    if (!rows.length) {
      // Fallback: procurar em memória quando DB não tem o registro
      const x = (memory.diarios_obra || []).find(d => Number(d.id) === id);
      if (x) return res.json(x);
      return res.status(404).json({ error: 'not_found' });
    }
    res.json(mapDiario(rows[0]));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const id = Number(req.params.id);
    const x = (memory.diarios_obra || []).find(d => Number(d.id) === id);
    if (!x) return res.status(404).json({ error: 'not_found' });
    res.json(x);
  }
});

app.post('/api/diarios-obra', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.diarios_obra (
      id_empreendimento, id_unidade, unidade_texto, nome_arquivo, numero_diario, data_diario,
      condicao_climatica, horas_paralisadas, periodo_trabalhado, efetivo, principais_atividades,
      ocorrencias_observacoes, fotos, vistos
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
    ) RETURNING *`;
    const params = [
      b.id_empreendimento, b.id_unidade ?? null, b.unidade_texto ?? null, b.nome_arquivo ?? null, b.numero_diario ?? null, normalizeDate(b.data_diario) ?? null,
      b.condicao_climatica ?? null, b.horas_paralisadas ?? null, b.periodo_trabalhado ?? null, b.efetivo ?? null, b.principais_atividades ?? null,
      b.ocorrencias_observacoes ?? null, toJson(b.fotos), toJson(b.vistos),
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapDiario(rows[0]));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    // Fallback em memória
    const b = req.body || {};
    const id = ++memoryIdSeq;
    const payload = {
      id,
      id_empreendimento: Number(b.id_empreendimento),
      id_unidade: b.id_unidade ?? null,
      unidade_texto: b.unidade_texto ?? null,
      nome_arquivo: b.nome_arquivo ?? null,
      numero_diario: b.numero_diario ?? null,
      data_diario: normalizeDate(b.data_diario) ?? null,
      condicao_climatica: b.condicao_climatica ?? null,
      horas_paralisadas: b.horas_paralisadas ?? null,
      periodo_trabalhado: b.periodo_trabalhado ?? null,
      efetivo: b.efetivo ?? null,
      principais_atividades: b.principais_atividades ?? null,
      ocorrencias_observacoes: b.ocorrencias_observacoes ?? null,
      fotos: b.fotos ?? null,
      vistos: b.vistos ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memory.diarios_obra.push(payload);
    res.status(201).json(payload);
  }
});

app.put('/api/diarios-obra/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.diarios_obra SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      id_unidade = COALESCE($2, id_unidade),
      unidade_texto = COALESCE($3, unidade_texto),
      nome_arquivo = COALESCE($4, nome_arquivo),
      numero_diario = COALESCE($5, numero_diario),
      data_diario = COALESCE($6, data_diario),
      condicao_climatica = COALESCE($7, condicao_climatica),
      horas_paralisadas = COALESCE($8, horas_paralisadas),
      periodo_trabalhado = COALESCE($9, periodo_trabalhado),
      efetivo = COALESCE($10, efetivo),
      principais_atividades = COALESCE($11, principais_atividades),
      ocorrencias_observacoes = COALESCE($12, ocorrencias_observacoes),
      fotos = COALESCE($13, fotos),
      vistos = COALESCE($14, vistos)
    WHERE id = $15 RETURNING *`;
    const params = [
      b.id_empreendimento ?? null, b.id_unidade ?? null, b.unidade_texto ?? null, b.nome_arquivo ?? null, b.numero_diario ?? null, normalizeDate(b.data_diario) ?? null,
      b.condicao_climatica ?? null, b.horas_paralisadas ?? null, b.periodo_trabalhado ?? null, b.efetivo ?? null, b.principais_atividades ?? null,
      b.ocorrencias_observacoes ?? null, toJson(b.fotos), toJson(b.vistos),
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapDiario(rows[0]));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const id = Number(req.params.id);
    const b = req.body || {};
    const x = memory.diarios_obra.find(d => d.id === id);
    if (!x) return res.status(404).json({ error: 'not_found' });
    x.id_empreendimento = b.id_empreendimento ?? x.id_empreendimento;
    x.id_unidade = b.id_unidade ?? x.id_unidade;
    x.unidade_texto = b.unidade_texto ?? x.unidade_texto;
    x.nome_arquivo = b.nome_arquivo ?? x.nome_arquivo;
    x.numero_diario = b.numero_diario ?? x.numero_diario;
    x.data_diario = normalizeDate(b.data_diario) ?? x.data_diario;
    x.condicao_climatica = b.condicao_climatica ?? x.condicao_climatica;
    x.horas_paralisadas = b.horas_paralisadas ?? x.horas_paralisadas;
    x.periodo_trabalhado = b.periodo_trabalhado ?? x.periodo_trabalhado;
    x.efetivo = b.efetivo ?? x.efetivo;
    x.principais_atividades = b.principais_atividades ?? x.principais_atividades;
    x.ocorrencias_observacoes = b.ocorrencias_observacoes ?? x.ocorrencias_observacoes;
    x.fotos = b.fotos ?? x.fotos;
    x.vistos = b.vistos ?? x.vistos;
    x.updated_at = new Date().toISOString();
    res.json(x);
  }
});

app.delete('/api/diarios-obra/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.diarios_obra WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const id = Number(req.params.id);
    const idx = (memory.diarios_obra || []).findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not_found' });
    memory.diarios_obra.splice(idx, 1);
    res.json({ ok: true });
  }
});

// ---- Vistorias Terminalidade ----
function mapTerminalidade(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_vistoria: row.data_vistoria,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_obra: row.eng_obra,
    secoes: row.secoes,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/vistorias-terminalidade', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.vistorias_terminalidade ${whereClause} ${orderClause}`, params);
    res.json(rows.map(mapTerminalidade));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const { id_empreendimento } = req.query;
    let data = memory.vistorias_terminalidade;
    if (id_empreendimento) data = data.filter(v => Number(v.id_empreendimento) === Number(id_empreendimento));
    res.json(data);
  }
});

app.get('/api/vistorias-terminalidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.vistorias_terminalidade WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapTerminalidade(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/vistorias-terminalidade', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.vistorias_terminalidade (
      id_empreendimento, data_vistoria, titulo_relatorio, subtitulo_relatorio,
      cliente, revisao, eng_obra, secoes, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9
    ) RETURNING *`;
    const params = [
      b.id_empreendimento, normalizeDate(b.data_vistoria) ?? null, b.titulo_relatorio ?? null, b.subtitulo_relatorio ?? null,
      b.cliente ?? null, b.revisao ?? null, b.eng_obra ?? null, toJson(b.secoes), toJson(b.assinaturas),
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapTerminalidade(rows[0]));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    // Fallback: criar em memória
    const b = req.body || {};
    const id = ++memoryIdSeq;
    const payload = {
      id,
      id_empreendimento: Number(b.id_empreendimento),
      data_vistoria: normalizeDate(b.data_vistoria) ?? null,
      titulo_relatorio: b.titulo_relatorio ?? null,
      subtitulo_relatorio: b.subtitulo_relatorio ?? null,
      cliente: b.cliente ?? null,
      revisao: b.revisao ?? null,
      eng_obra: b.eng_obra ?? null,
      secoes: b.secoes ?? null,
      assinaturas: b.assinaturas ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memory.vistorias_terminalidade.push(payload);
    res.status(201).json(payload);
  }
});

app.put('/api/vistorias-terminalidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.vistorias_terminalidade SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_vistoria = COALESCE($2, data_vistoria),
      titulo_relatorio = COALESCE($3, titulo_relatorio),
      subtitulo_relatorio = COALESCE($4, subtitulo_relatorio),
      cliente = COALESCE($5, cliente),
      revisao = COALESCE($6, revisao),
      eng_obra = COALESCE($7, eng_obra),
      secoes = COALESCE($8, secoes),
      assinaturas = COALESCE($9, assinaturas)
    WHERE id = $10 RETURNING *`;
    const params = [
      b.id_empreendimento ?? null, normalizeDate(b.data_vistoria) ?? null, b.titulo_relatorio ?? null, b.subtitulo_relatorio ?? null,
      b.cliente ?? null, b.revisao ?? null, b.eng_obra ?? null, toJson(b.secoes), toJson(b.assinaturas),
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapTerminalidade(rows[0]));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const id = Number(req.params.id);
    const b = req.body || {};
    const x = memory.vistorias_terminalidade.find(v => v.id === id);
    if (!x) return res.status(404).json({ error: 'not_found' });
    x.id_empreendimento = b.id_empreendimento ?? x.id_empreendimento;
    x.data_vistoria = normalizeDate(b.data_vistoria) ?? x.data_vistoria;
    x.titulo_relatorio = b.titulo_relatorio ?? x.titulo_relatorio;
    x.subtitulo_relatorio = b.subtitulo_relatorio ?? x.subtitulo_relatorio;
    x.cliente = b.cliente ?? x.cliente;
    x.revisao = b.revisao ?? x.revisao;
    x.eng_obra = b.eng_obra ?? x.eng_obra;
    x.secoes = b.secoes ?? x.secoes;
    x.assinaturas = b.assinaturas ?? x.assinaturas;
    x.updated_at = new Date().toISOString();
    res.json(x);
  }
});

app.delete('/api/vistorias-terminalidade/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.vistorias_terminalidade WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const id = Number(req.params.id);
    const idx = memory.vistorias_terminalidade.findIndex(v => v.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not_found' });
    memory.vistorias_terminalidade.splice(idx, 1);
    res.json({ ok: true });
  }
});

// ---- Relatorios Primeiros Servicos ----
function mapRPS(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    cliente: row.cliente,
    local: row.local,
    solicitante: row.solicitante,
    obra: row.obra,
    disciplina: row.disciplina,
    data_relatorio: row.data_relatorio,
    assunto_relatorio: row.assunto_relatorio,
    descricao_relatorio: row.descricao_relatorio,
    fotos: row.fotos,
    status: row.status,
    comentarios_status: row.comentarios_status,
    aprovacoes: row.aprovacoes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/relatorios-primeiros-servicos', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.relatorios_primeiros_servicos ${whereClause} ${orderClause}`);
    res.json(rows.map(mapRPS));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/relatorios-primeiros-servicos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.relatorios_primeiros_servicos WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRPS(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/relatorios-primeiros-servicos', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.relatorios_primeiros_servicos (
      id_empreendimento, cliente, local, solicitante, obra, disciplina, data_relatorio,
      assunto_relatorio, descricao_relatorio, fotos, status, comentarios_status, aprovacoes
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
    ) RETURNING *`;
    const params = [
      b.id_empreendimento, b.cliente ?? null, b.local ?? null, b.solicitante ?? null, b.obra ?? null, b.disciplina ?? null, b.data_relatorio ?? null,
      b.assunto_relatorio ?? null, b.descricao_relatorio ?? null, b.fotos ?? null, b.status ?? null, b.comentarios_status ?? null, b.aprovacoes ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapRPS(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/relatorios-primeiros-servicos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.relatorios_primeiros_servicos SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      cliente = COALESCE($2, cliente),
      local = COALESCE($3, local),
      solicitante = COALESCE($4, solicitante),
      obra = COALESCE($5, obra),
      disciplina = COALESCE($6, disciplina),
      data_relatorio = COALESCE($7, data_relatorio),
      assunto_relatorio = COALESCE($8, assunto_relatorio),
      descricao_relatorio = COALESCE($9, descricao_relatorio),
      fotos = COALESCE($10, fotos),
      status = COALESCE($11, status),
      comentarios_status = COALESCE($12, comentarios_status),
      aprovacoes = COALESCE($13, aprovacoes)
    WHERE id = $14 RETURNING *`;
    const params = [
      b.id_empreendimento ?? null, b.cliente ?? null, b.local ?? null, b.solicitante ?? null, b.obra ?? null, b.disciplina ?? null, b.data_relatorio ?? null,
      b.assunto_relatorio ?? null, b.descricao_relatorio ?? null, b.fotos ?? null, b.status ?? null, b.comentarios_status ?? null, b.aprovacoes ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRPS(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/relatorios-primeiros-servicos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.relatorios_primeiros_servicos WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Aprovacoes de Amostra ----
function mapAmostraRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    cliente: row.cliente,
    disciplina: row.disciplina,
    local: row.local,
    obra: row.obra,
    assunto_amostra: row.assunto_amostra,
    descricao_amostra: row.descricao_amostra,
    status: row.status,
    comentarios_status: row.comentarios_status,
    aprovacoes: row.aprovacoes,
    fotos: row.fotos,
    nome_arquivo: row.nome_arquivo,
    data_relatorio: row.data_relatorio,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/aprovacoes-amostra', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.aprovacoes_amostra ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapAmostraRow));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/aprovacoes-amostra/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.aprovacoes_amostra WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapAmostraRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/aprovacoes-amostra', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.aprovacoes_amostra (
      id_empreendimento, cliente, disciplina, local, obra, assunto_amostra, descricao_amostra,
      status, comentarios_status, aprovacoes, fotos, nome_arquivo, data_relatorio
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
    ) RETURNING *`;
    const params = [
      b.id_empreendimento, b.cliente ?? null, b.disciplina ?? null, b.local ?? null, b.obra ?? null, b.assunto_amostra ?? null, b.descricao_amostra ?? null,
      b.status ?? null, b.comentarios_status ?? null, b.aprovacoes ?? null, b.fotos ?? null, b.nome_arquivo ?? null, b.data_relatorio ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapAmostraRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/aprovacoes-amostra/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.aprovacoes_amostra SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      cliente = COALESCE($2, cliente),
      disciplina = COALESCE($3, disciplina),
      local = COALESCE($4, local),
      obra = COALESCE($5, obra),
      assunto_amostra = COALESCE($6, assunto_amostra),
      descricao_amostra = COALESCE($7, descricao_amostra),
      status = COALESCE($8, status),
      comentarios_status = COALESCE($9, comentarios_status),
      aprovacoes = COALESCE($10, aprovacoes),
      fotos = COALESCE($11, fotos),
      nome_arquivo = COALESCE($12, nome_arquivo),
      data_relatorio = COALESCE($13, data_relatorio)
    WHERE id = $14 RETURNING *`;
    const params = [
      b.id_empreendimento ?? null, b.cliente ?? null, b.disciplina ?? null, b.local ?? null, b.obra ?? null, b.assunto_amostra ?? null, b.descricao_amostra ?? null,
      b.status ?? null, b.comentarios_status ?? null, b.aprovacoes ?? null, b.fotos ?? null, b.nome_arquivo ?? null, b.data_relatorio ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapAmostraRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/aprovacoes-amostra/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.aprovacoes_amostra WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Empreendimentos ----
function mapEmpreendimentoRow(row) {
  return {
    // Fornecer id como string (compatibilidade com UI antiga) e numérico nos aliases
    id: String(row.id),
    id_empreendimento: String(row.id),
    id_num: typeof row.id === 'string' ? Number(row.id) : row.id,
    nome_empreendimento: row.nome_empreendimento,
    // Alias usado por partes da UI
    nome: row.nome_empreendimento,
    // Campos conforme schema
    cliente: row.cli_empreendimento ?? null,
    endereco: row.endereco_empreendimento ?? null,
    foto_empreendimento: row.foto_empreendimento ?? null,
    os_number: row.os_number ?? null,
    sigla_obra: row.sigla_obra ?? null,
    data_inicio_contrato: row.data_inicio_contrato ?? null,
    termino_obra_previsto: row.termino_obra_previsto ?? null,
    data_sem_entrega: row.data_sem_entrega ?? null,
    data_termino_contrato: row.data_termino_contrato ?? null,
    valor_contratual: row.valor_contratual != null ? Number(String(row.valor_contratual)) : null,
    prazo_contratual_dias: row.prazo_contratual_dias != null ? Number(row.prazo_contratual_dias) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/empreendimentos', async (req, res) => {
  try {
    const p = requirePool();
    const { id, nome_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id) { where.push('id = $' + (params.length + 1)); params.push(Number(id)); }
    if (nome_empreendimento) { where.push('nome_empreendimento ILIKE $' + (params.length + 1)); params.push('%' + String(nome_empreendimento) + '%'); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.empreendimentos ${whereClause} ${orderClause}`);
    res.json(rows.map(mapEmpreendimentoRow));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.json(memory.empreendimentos.map(mapEmpreendimentoRow));
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/empreendimentos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.empreendimentos WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapEmpreendimentoRow(rows[0]));
  } catch (err) {
    // Fallback em memória quando DB indisponível
    if (shouldReturnEmptyOnDbError(err)) {
      const id = Number(req.params.id);
      const found = memory.empreendimentos.find((e) => e.id === id);
      if (!found) return res.status(404).json({ error: 'not_found' });
      return res.json(mapEmpreendimentoRow(found));
    }
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    res.status(500).json({ error: msg, code });
  }
});

app.post('/api/empreendimentos', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    // Validação mínima
    if (!b.nome_empreendimento && !b.nome) {
      return res.status(400).json({ error: 'missing_nome_empreendimento' });
    }
    const sql = `INSERT INTO public.empreendimentos (
      nome_empreendimento, cli_empreendimento, endereco_empreendimento, foto_empreendimento, os_number, sigla_obra,
      data_inicio_contrato, termino_obra_previsto, data_sem_entrega, data_termino_contrato,
      valor_contratual, prazo_contratual_dias
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
    ) RETURNING *`;
    const nn = (v) => (v === '' || v === undefined || v === null ? null : v);
    const toNumber = (v) => {
      if (v === '' || v === undefined || v === null) return null;
      const n = Number(String(v).replace(',', '.'));
      return Number.isNaN(n) ? null : n;
    };
    const toInt = (v) => {
      if (v === '' || v === undefined || v === null) return null;
      const n = parseInt(String(v), 10);
      return Number.isNaN(n) ? null : n;
    };
    const params = [
      nn(b.nome_empreendimento ?? b.nome),
      nn(b.cliente ?? b.cli_empreendimento),
      nn(b.endereco ?? b.endereco_empreendimento),
      nn(b.foto_empreendimento),
      nn(b.os_number),
      nn(b.sigla_obra),
      nn(b.data_inicio_contrato),
      nn(b.termino_obra_previsto),
      nn(b.data_sem_entrega),
      nn(b.data_termino_contrato),
      toNumber(b.valor_contratual),
      toInt(b.prazo_contratual_dias),
    ];
    const { rows } = await p.query(sql, params);
    // Log de sucesso de criação para facilitar diagnóstico
    console.log('[ok] empreendimento criado', { id: rows[0]?.id, nome: rows[0]?.nome_empreendimento });
    res.status(201).json(mapEmpreendimentoRow(rows[0]));
  } catch (err) {
    // Fallback em memória quando DB indisponível
    if (shouldReturnEmptyOnDbError(err)) {
      const created = {
        id: memoryIdSeq++,
        nome_empreendimento: (req.body?.nome_empreendimento ?? req.body?.nome) ?? null,
        cli_empreendimento: req.body?.cliente ?? null,
        endereco_empreendimento: (req.body?.endereco ?? req.body?.endereco_empreendimento) ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memory.empreendimentos.push(created);
      return res.status(201).json(mapEmpreendimentoRow(created));
    }
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[error] POST /api/empreendimentos', { msg, code, detail });
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/empreendimentos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.empreendimentos SET
      nome_empreendimento = COALESCE($1, nome_empreendimento),
      cli_empreendimento = COALESCE($2, cli_empreendimento),
      endereco_empreendimento = COALESCE($3, endereco_empreendimento),
      foto_empreendimento = COALESCE($4, foto_empreendimento),
      os_number = COALESCE($5, os_number),
      sigla_obra = COALESCE($6, sigla_obra),
      data_inicio_contrato = COALESCE($7, data_inicio_contrato),
      termino_obra_previsto = COALESCE($8, termino_obra_previsto),
      data_sem_entrega = COALESCE($9, data_sem_entrega),
      data_termino_contrato = COALESCE($10, data_termino_contrato),
      valor_contratual = COALESCE($11, valor_contratual),
      prazo_contratual_dias = COALESCE($12, prazo_contratual_dias)
    WHERE id = $13 RETURNING *`;
    const nn2 = (v) => (v === '' || v === undefined || v === null ? null : v);
    const params = [
      nn2(b.nome_empreendimento ?? b.nome),
      nn2(b.cliente ?? b.cli_empreendimento),
      nn2(b.endereco ?? b.endereco_empreendimento),
      nn2(b.foto_empreendimento),
      nn2(b.os_number),
      nn2(b.sigla_obra),
      nn2(b.data_inicio_contrato),
      nn2(b.termino_obra_previsto),
      nn2(b.data_sem_entrega),
      nn2(b.data_termino_contrato),
      nn2(b.valor_contratual),
      nn2(b.prazo_contratual_dias),
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapEmpreendimentoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/empreendimentos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.empreendimentos WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Unidades Empreendimento ----
function mapUnidadeRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    unidade_empreendimento: row.unidade_empreendimento,
    cliente_unidade: row.cliente_unidade,
    metragem_unidade: row.metragem_unidade != null ? Number(row.metragem_unidade) : null,
    escopo_unidade: row.escopo_unidade,
    contatos: row.contatos,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/unidades-empreendimento', async (req, res) => {
  try {
    const p = requirePool();
    const { id, id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id) { where.push('id = $' + (params.length + 1)); params.push(Number(id)); }
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.unidades_empreendimento ${whereClause} ${orderClause}`, params);
    res.json(rows.map(mapUnidadeRow));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      // Fallback em memória
      const { id, id_empreendimento } = req.query;
      let list = memory.unidades_empreendimento;
      if (id) list = list.filter(u => String(u.id) === String(id));
      if (id_empreendimento) list = list.filter(u => String(u.id_empreendimento) === String(id_empreendimento));
      return res.json(list.map(mapUnidadeRow));
    }
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[error] GET /api/unidades-empreendimento', { msg, code });
    res.status(500).json({ error: msg, code });
  }
});

app.get('/api/unidades-empreendimento/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.unidades_empreendimento WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapUnidadeRow(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      const id = Number(req.params.id);
      const found = memory.unidades_empreendimento.find(u => u.id === id);
      if (!found) return res.status(404).json({ error: 'not_found' });
      return res.json(mapUnidadeRow(found));
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/unidades-empreendimento', async (req, res) => {
  const b = req.body || {};
  const idEmp = Number(b.id_empreendimento ?? b.empreendimento_id);
  const nomeUnidade = String(b.unidade_empreendimento ?? b.nome_unidade ?? '').trim();
  const cliente = b.cliente_unidade ?? null;
  const metragem = (() => {
    const v = b.metragem_unidade;
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  })();
  const escopo = b.escopo_unidade ?? null;
  const contatos = b.contatos ?? null;

  if (!idEmp || !nomeUnidade) {
    return res.status(400).json({ error: 'missing_fields', required: ['id_empreendimento', 'unidade_empreendimento'] });
  }

  try {
    const p = requirePool();
    // Verificar existência do empreendimento para evitar violação de FK
    try {
      const chk = await p.query('SELECT 1 FROM public.empreendimentos WHERE id = $1', [idEmp]);
      if (!chk.rows.length) {
        return res.status(400).json({ error: 'invalid_empreendimento', id: idEmp });
      }
    } catch (e) {
      if (shouldReturnEmptyOnDbError(e)) {
        // Fallback: criar em memória quando DB estiver indisponível
        const created = {
          id: memoryIdSeq++,
          id_empreendimento: idEmp,
          unidade_empreendimento: nomeUnidade,
          descricao_unidade: descricao,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        memory.unidades_empreendimento.push(created);
        return res.status(201).json(mapUnidadeRow(created));
      }
      throw e;
    }

    const sql = `INSERT INTO public.unidades_empreendimento (
      id_empreendimento, unidade_empreendimento, cliente_unidade, metragem_unidade, escopo_unidade, contatos
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *`;
    const params = [idEmp, nomeUnidade, cliente, metragem, escopo, toJson(contatos)];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapUnidadeRow(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      const created = {
        id: memoryIdSeq++,
        id_empreendimento: idEmp,
        unidade_empreendimento: nomeUnidade,
        cliente_unidade: cliente,
        metragem_unidade: metragem,
        escopo_unidade: escopo,
        contatos: contatos,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memory.unidades_empreendimento.push(created);
      return res.status(201).json(mapUnidadeRow(created));
    }
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[error] POST /api/unidades-empreendimento', { msg, code, detail });
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/unidades-empreendimento/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const metragem = (() => {
    const v = b.metragem_unidade;
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  })();
  try {
    const p = requirePool();
    const sql = `UPDATE public.unidades_empreendimento SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      unidade_empreendimento = COALESCE($2, unidade_empreendimento),
      cliente_unidade = COALESCE($3, cliente_unidade),
      metragem_unidade = COALESCE($4, metragem_unidade),
      escopo_unidade = COALESCE($5, escopo_unidade),
      contatos = COALESCE($6::jsonb, contatos)
    WHERE id = $7 RETURNING *`;
    const params = [
      b.id_empreendimento ?? b.empreendimento_id ?? null,
      b.unidade_empreendimento ?? b.nome_unidade ?? null,
      b.cliente_unidade ?? null,
      metragem,
      b.escopo_unidade ?? null,
      toJson(b.contatos ?? null),
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapUnidadeRow(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      const found = memory.unidades_empreendimento.find(u => u.id === id);
      if (!found) return res.status(404).json({ error: 'not_found' });
      found.id_empreendimento = b.id_empreendimento ?? found.id_empreendimento;
      found.unidade_empreendimento = b.unidade_empreendimento ?? found.unidade_empreendimento;
      found.cliente_unidade = b.cliente_unidade ?? found.cliente_unidade;
      found.metragem_unidade = metragem ?? found.metragem_unidade;
      found.escopo_unidade = b.escopo_unidade ?? found.escopo_unidade;
      found.contatos = b.contatos ?? found.contatos;
      found.updated_at = new Date().toISOString();
      return res.json(mapUnidadeRow(found));
    }
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/unidades-empreendimento/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const p = requirePool();
    const { rowCount } = await p.query('DELETE FROM public.unidades_empreendimento WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      const idx = memory.unidades_empreendimento.findIndex(u => u.id === id);
      if (idx === -1) return res.status(404).json({ error: 'not_found' });
      memory.unidades_empreendimento.splice(idx, 1);
      return res.json({ ok: true });
    }
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    res.status(500).json({ error: msg, code });
  }
});

// ---- Formularios de Vistoria ----
function mapFormularioRow(row) {
  return {
    id: row.id,
    nome_formulario: row.nome_formulario,
    descricao_formulario: row.descricao_formulario ?? null,
    status_formulario: row.status_formulario,
    secoes: row.secoes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/formularios-vistoria', async (req, res) => {
  try {
    const p = requirePool();
    const { status_formulario, order } = req.query;
    const where = [];
    const params = [];
    if (status_formulario) { where.push('status_formulario = $' + (params.length + 1)); params.push(String(status_formulario)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.formularios_vistoria ${whereClause} ${orderClause}`);
    res.json(rows.map(mapFormularioRow));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/formularios-vistoria/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.formularios_vistoria WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapFormularioRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/formularios-vistoria', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.formularios_vistoria (
      nome_formulario, descricao_formulario, status_formulario, secoes
    ) VALUES (
      $1, $2, $3, $4
    ) RETURNING *`;
    const params = [
      b.nome_formulario,
      b.descricao_formulario ?? null,
      b.status_formulario ?? 'Ativo',
      toJson(Array.isArray(b.secoes) ? b.secoes : [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapFormularioRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/formularios-vistoria/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.formularios_vistoria SET
      nome_formulario = COALESCE($1, nome_formulario),
      descricao_formulario = COALESCE($2, descricao_formulario),
      status_formulario = COALESCE($3, status_formulario),
      secoes = COALESCE($4, secoes)
    WHERE id = $5 RETURNING *`;
    const params = [
      b.nome_formulario ?? null,
      b.descricao_formulario ?? null,
      b.status_formulario ?? null,
      'secoes' in b ? toJson(Array.isArray(b.secoes) ? b.secoes : []) : null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapFormularioRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/formularios-vistoria/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.formularios_vistoria WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// ---- Usuarios ----
function mapUsuarioRow(row) {
  const perfilCliente = (typeof row.perfil_cliente !== 'undefined') ? row.perfil_cliente : ((row.role || '') === 'cliente');
  let ativo = true;
  let empreendimentos = [];
  try {
    if (row.perfil && typeof row.perfil === 'object' && row.perfil !== null && 'ativo' in row.perfil) {
      ativo = !!row.perfil.ativo;
    }
    if (row.perfil && typeof row.perfil === 'object' && row.perfil !== null && Array.isArray(row.perfil.empreendimentos_vinculados)) {
      empreendimentos = row.perfil.empreendimentos_vinculados
        .map(v => { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; })
        .filter(v => v !== null);
    }
  } catch { }
  return {
    id: row.id,
    email: row.email,
    nome: row.nome || '',
    role: row.role || 'user',
    perfil_cliente: perfilCliente,
    ativo,
    empreendimentos_vinculados: empreendimentos,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function requireAdmin(req, res) {
  const u = req.user;
  if (!u) { res.status(401).json({ error: 'unauthorized' }); return null; }
  if ((u.role || '') !== 'admin') { res.status(403).json({ error: 'forbidden' }); return null; }
  return u;
}

app.get('/api/usuarios', async (req, res) => {
  try {
    const u = requireAdmin(req, res); if (!u) return;
    try {
      const p = requirePool();
      const { search } = req.query;
      const where = [];
      const params = [];
      if (search) { where.push('(email ILIKE $1 OR nome ILIKE $1)'); params.push(`%${String(search)}%`); }
      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const { rows } = await p.query(`SELECT id, email, nome, role, perfil_cliente, perfil, created_at, updated_at FROM public.usuarios ${whereClause} ORDER BY created_at DESC`, params);
      if (rows.length === 0 && req.user) {
        // Fallback: sempre exibir o usuário atual na lista
        return res.json([mapUsuarioRow({
          id: req.user.sub,
          email: req.user.email,
          nome: req.user.nome || '',
          role: req.user.role || 'user',
          perfil_cliente: (req.user.role || '') === 'cliente',
          perfil: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })]);
      }
      res.json(rows.map(mapUsuarioRow));
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      const base = memory.usuarios.map(x => ({
        id: x.id,
        email: x.email,
        nome: x.nome || '',
        role: x.role || 'user',
        perfil_cliente: !!x.perfil_cliente || (x.role === 'cliente'),
        ativo: ('ativo' in (x.perfil || {})) ? !!x.perfil.ativo : true,
        empreendimentos_vinculados: Array.isArray((x.perfil || {}).empreendimentos_vinculados) ? (x.perfil.empreendimentos_vinculados || []).map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v)) : []
      }));
      if (base.length === 0 && req.user) {
        base.push({ id: req.user.sub, email: req.user.email, nome: req.user.nome || '', role: req.user.role || 'user', perfil_cliente: (req.user.role || '') === 'cliente', ativo: true });
      }
      res.json(base);
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/usuarios/me', (req, res) => {
  // Compatibilidade: use token se presente
  if (req.user) return res.json({ id: req.user.sub, email: req.user.email, nome: req.user.nome || '', role: req.user.role || 'user', perfil_cliente: ((req.user.role || '') === 'cliente') });
  res.status(401).json({ error: 'unauthorized' });
});

app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const u = requireAdmin(req, res); if (!u) return;
    try {
      const p = requirePool();
      const id = Number(req.params.id);
      const { rows } = await p.query('SELECT id, email, nome, role, perfil_cliente, perfil, created_at, updated_at FROM public.usuarios WHERE id = $1', [id]);
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      res.json(mapUsuarioRow(rows[0]));
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      const x = memory.usuarios.find(m => m.id === Number(req.params.id));
      if (!x) return res.status(404).json({ error: 'not_found' });
      res.json({
        id: x.id,
        email: x.email,
        nome: x.nome || '',
        role: x.role || 'user',
        perfil_cliente: !!x.perfil_cliente || (x.role === 'cliente'),
        ativo: ('ativo' in (x.perfil || {})) ? !!x.perfil.ativo : true,
        empreendimentos_vinculados: Array.isArray((x.perfil || {}).empreendimentos_vinculados) ? (x.perfil.empreendimentos_vinculados || []).map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v)) : []
      });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const u = requireAdmin(req, res); if (!u) return;
    const b = req.body || {};
    const email = String(b.email || '').trim();
    const nome = String(b.nome || '').trim();
    const role = (String(b.role || 'cliente').toLowerCase() === 'admin') ? 'admin' : 'cliente';
    const perfil_cliente = role === 'cliente' ? true : !!b.perfil_cliente;
    const pwd = b.password || crypto.randomBytes(6).toString('hex');
    try {
      const p = requirePool();
      // Try insert with perfil_cliente
      let row;
      try {
        const ins = await p.query('INSERT INTO public.usuarios (email, nome, password_hash, role, perfil_cliente, perfil) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, nome, role, perfil_cliente, perfil, created_at, updated_at', [email, nome, hashPassword(pwd), role, perfil_cliente, {}]);
        row = ins.rows[0];
      } catch (errIns) {
        const ins2 = await p.query('INSERT INTO public.usuarios (email, nome, password_hash, role, perfil) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, nome, role, perfil, created_at, updated_at', [email, nome, hashPassword(pwd), role, {}]);
        row = ins2.rows[0];
      }
      res.status(201).json(mapUsuarioRow(row));
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      if (memory.usuarios.find(x => x.email === email)) return res.status(409).json({ error: 'email_exists' });
      const id = ++memoryIdSeq;
      memory.usuarios.push({ id, email, nome, password_hash: hashPassword(pwd), role, perfil_cliente, perfil: {} });
      res.status(201).json({ id, email, nome, role, perfil_cliente, ativo: true });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const u = requireAdmin(req, res); if (!u) return;
    const id = Number(req.params.id);
    const b = req.body || {};
    const role = b.role ? (String(b.role).toLowerCase() === 'admin' ? 'admin' : 'cliente') : null;
    const nome = typeof b.nome !== 'undefined' ? String(b.nome) : null;
    const perfil_cliente = typeof b.perfil_cliente !== 'undefined' ? !!b.perfil_cliente : null;
    const newPwd = typeof b.password !== 'undefined' ? String(b.password) : null;
    // Permite gravar dados auxiliares em JSON (inclui empreendimentos vinculados)
    let perfil = null;
    if (typeof b.perfil !== 'undefined' && b.perfil !== null) {
      perfil = b.perfil;
    } else if (Array.isArray(b.empreendimentos_vinculados)) {
      const norm = b.empreendimentos_vinculados
        .map(v => { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; })
        .filter(v => v !== null);
      perfil = { ...(b.perfil || {}), empreendimentos_vinculados: norm };
    }
    try {
      const p = requirePool();
      let row;
      try {
        const sql = `UPDATE public.usuarios SET
          nome = COALESCE($1, nome),
          role = COALESCE($2, role),
          perfil_cliente = COALESCE($3, perfil_cliente),
          password_hash = COALESCE($4, password_hash),
          perfil = COALESCE($5::jsonb, perfil)
        WHERE id = $6 RETURNING id, email, nome, role, perfil_cliente, perfil, created_at, updated_at`;
        const params = [nome, role, perfil_cliente, newPwd ? hashPassword(newPwd) : null, toJson(perfil), id];
        const up = await p.query(sql, params);
        if (!up.rows.length) return res.status(404).json({ error: 'not_found' });
        row = up.rows[0];
      } catch (errUp) {
        const sql2 = `UPDATE public.usuarios SET
          nome = COALESCE($1, nome),
          role = COALESCE($2, role),
          password_hash = COALESCE($3, password_hash),
          perfil = COALESCE($4::jsonb, perfil)
        WHERE id = $5 RETURNING id, email, nome, role, perfil, created_at, updated_at`;
        const params2 = [nome, role, newPwd ? hashPassword(newPwd) : null, toJson(perfil), id];
        const up2 = await p.query(sql2, params2);
        if (!up2.rows.length) return res.status(404).json({ error: 'not_found' });
        row = up2.rows[0];
      }
      res.json(mapUsuarioRow(row));
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      const x = memory.usuarios.find(m => m.id === id);
      if (!x) return res.status(404).json({ error: 'not_found' });
      if (nome !== null) x.nome = nome;
      if (role !== null) x.role = role;
      if (perfil_cliente !== null) x.perfil_cliente = perfil_cliente;
      if (perfil !== null) x.perfil = { ...(x.perfil || {}), ...perfil };
      if (newPwd !== null) x.password_hash = hashPassword(newPwd);
      res.json({
        id: x.id,
        email: x.email,
        nome: x.nome || '',
        role: x.role || 'user',
        perfil_cliente: !!x.perfil_cliente || (x.role === 'cliente'),
        ativo: ('ativo' in (x.perfil || {})) ? !!x.perfil.ativo : true,
        empreendimentos_vinculados: Array.isArray((x.perfil || {}).empreendimentos_vinculados) ? (x.perfil.empreendimentos_vinculados || []).map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v)) : []
      });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ===== Vínculos Usuário x Empreendimentos =====
// GET lista de IDs de empreendimentos vinculados a um usuário
app.get('/api/usuarios/:id/empreendimentos', async (req, res) => {
  try {
    const u = requireAdmin(req, res); if (!u) return;
    const userId = Number(req.params.id);
    try {
      const p = requirePool();
      const sql = `SELECT empreendimento_id FROM public.usuarios_empreendimentos WHERE user_id = $1 ORDER BY empreendimento_id`;
      const { rows } = await p.query(sql, [userId]);
      res.json(rows.map(r => r.empreendimento_id));
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      const ids = memory.usuarios_empreendimentos.filter(x => x.user_id === userId).map(x => x.empreendimento_id);
      res.json(ids);
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// PUT substitui a lista de IDs de empreendimentos vinculados a um usuário
app.put('/api/usuarios/:id/empreendimentos', async (req, res) => {
  try {
    const u = requireAdmin(req, res); if (!u) return;
    const userId = Number(req.params.id);
    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const normIds = ids
      .map(v => {
        const n = parseInt(v, 10);
        return Number.isNaN(n) ? null : n;
      })
      .filter(v => v !== null);
    try {
      const p = requirePool();
      // Apagar vínculos existentes e inserir os novos
      // Se a tabela não existir, o catch cairá no fallback em memória
      await p.query('BEGIN');
      try {
        await p.query('DELETE FROM public.usuarios_empreendimentos WHERE user_id = $1', [userId]);
        if (normIds.length) {
          const values = normIds.map((_, i) => `($1, $${i + 2})`).join(',');
          await p.query(`INSERT INTO public.usuarios_empreendimentos (user_id, empreendimento_id) VALUES ${values}`, [userId, ...normIds]);
        }
        await p.query('COMMIT');
      } catch (e) {
        await p.query('ROLLBACK');
        throw e;
      }
      res.json({ ok: true, ids: normIds });
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      // Fallback em memória
      memory.usuarios_empreendimentos = memory.usuarios_empreendimentos.filter(x => x.user_id !== userId);
      normIds.forEach(id => memory.usuarios_empreendimentos.push({ user_id: userId, empreendimento_id: id }));
      res.json({ ok: true, ids: normIds });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Stubs para entidades ainda não mapeadas ----
// Evita 404 no frontend enquanto as rotas reais são implementadas
app.get('/api/registros-unidade', (_req, res) => {
  res.json([]);
});

app.get('/api/registros-gerais', (_req, res) => {
  res.json([]);
});

app.get('/api/disciplinas-gerais', (_req, res) => {
  res.json([]);
});
