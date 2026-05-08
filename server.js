import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from "pg";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import compression from 'compression';
import { fileURLToPath } from 'url';
// sharp will be imported dynamically when needed to avoid startup failure if not installed


dotenv.config();

// ESM polyfill for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

console.log('🚀 Iniciando servidor (segurança básica: CORS restrito, helmet, rate-limit)');

// Helper para construir URLs completas
function getServerBaseUrl() {
  // Em produção no Render, usar URL do backend
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    return 'https://backend-fitout.onrender.com';
  }
  // Em desenvolvimento, usar localhost
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

// Silence verbose logs in production to reduce noise and bundle size
if (process.env.NODE_ENV === 'production') {
  console.log = () => { };
  console.debug = () => { };
}

// ⚠️ IMPORTANTE: Endpoint de arquivos ANTES dos middlewares de segurança
// para evitar bloqueios de CORS/CSP do helmet
app.get('/api/files/:id', async (req, res) => {
  // Headers CORS totalmente abertos para imagens
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  try {
    // Use shared pool via requirePool() to respect global SSL/config
    const p = requirePool();

    const { rows } = await p.query(
      'SELECT nome_original, mime_type, dados FROM arquivos WHERE id = $1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'file_not_found' });
    }

    const file = rows[0];
    // Defensive: ensure dados exists
    if (!file.dados) {
      console.error('Arquivo sem dados encontrado id=', req.params.id);
      return res.status(404).json({ error: 'file_no_data' });
    }

    const safeName = String(path.basename(file.nome_original || 'file')).replace(/\"/g, '').slice(0, 255);

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.send(file.dados);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Erro ao buscar arquivo:', err && (err.stack || err.message || String(err)));
    // If the DB is in recovery or otherwise not accepting connections, return 503 with Retry-After
    const lower = String(msg || '').toLowerCase();
    if (lower.includes('recovery') || lower.includes('not yet accepting') || lower.includes('in recovery mode') || lower.includes('57p03')) {
      // advise clients to retry after a short period
      res.setHeader('Retry-After', '30');
      return res.status(503).json({ error: 'db_recovery', message: msg });
    }
    return res.status(500).json({ error: msg });
  }
});

// OPTIONS handler para /api/files/*
app.options('/api/files/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.sendStatus(200);
});

// Security middleware
// Disable CSP here because Vite index.html includes inline scripts used by the frontend shell.
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiting for API endpoints
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Key generator extracted so we can reuse for auth-specific limiter as well
const keyGeneratorFn = (req /*, res */) => {
  try {
    return req.user && req.user.sub ? `user:${req.user.sub}` : req.ip;
  } catch {
    return req.ip;
  }
};

const apiLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 200,
  standardHeaders: true,
  legacyHeaders: false,
  // Use authenticated user id as key if available, else use IP
  keyGenerator: keyGeneratorFn,
  // Custom handler so we can log and return JSON with Retry-After
  handler: (req, res /*, next */) => {
    try {
      console.warn(`[RATE LIMIT] ip=${req.ip} user=${req.user ? req.user.sub : 'anon'} method=${req.method} url=${req.originalUrl}`);
    } catch (e) {
      console.warn('[RATE LIMIT] hit, could not log details');
    }
    res.set('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000));
    return res.status(429).json({ error: 'rate_limited', message: 'Too many requests' });
  }
});

// Read-heavy screens can trigger many GETs in parallel; keep a higher cap for read routes.
const apiReadLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: process.env.RATE_LIMIT_READ_MAX ? parseInt(process.env.RATE_LIMIT_READ_MAX, 10) : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGeneratorFn,
  handler: (req, res) => {
    try {
      console.warn(`[RATE LIMIT][READ] ip=${req.ip} user=${req.user ? req.user.sub : 'anon'} method=${req.method} url=${req.originalUrl}`);
    } catch (e) {
      console.warn('[RATE LIMIT][READ] hit, could not log details');
    }
    res.set('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000));
    return res.status(429).json({ error: 'rate_limited', message: 'Too many requests (read)' });
  }
});

// CORS: restrict by allowed origins set in env `ALLOWED_ORIGINS` (comma separated)
const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS;
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV
  ? ALLOWED_ORIGINS_ENV.split(',').map(s => s.trim()).filter(Boolean)
  : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']);

// Log allowed origins at startup to help debugging local dev CORS issues
console.log('ALLOWED_ORIGINS (env):', ALLOWED_ORIGINS_ENV);
console.log('ALLOWED_ORIGINS (parsed):', ALLOWED_ORIGINS);

// In production require ALLOWED_ORIGINS to be explicitly set
if (process.env.NODE_ENV === 'production' && (!ALLOWED_ORIGINS_ENV || ALLOWED_ORIGINS.length === 0)) {
  console.error('FATAL: ALLOWED_ORIGINS is not set. Set environment variable ALLOWED_ORIGINS with allowed frontend origins and restart.');
  process.exit(1);
}

const ALLOW_CREDENTIALS = (process.env.ALLOW_CREDENTIALS || '').toLowerCase() === 'true';
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.length === 0) return callback(new Error('CORS not configured'), false);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: ALLOW_CREDENTIALS,
  optionsSuccessStatus: 204
}));

// Global error handler for CORS rejection to return explicit 403
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.message && (err.message.includes('CORS') || err.message.includes('Not allowed by CORS') || err.message.includes('CORS not configured'))) {
    return res.status(403).json({ error: 'cors_not_allowed', message: err.message });
  }
  next(err);
});

app.use(express.json());

// Apply rate limiting after CORS so preflight (OPTIONS) receives the CORS headers
// Create an auth-specific limiter with a higher default limit so public registration/login
// endpoints are not easily rate-limited by the global API limiter.
const authLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: process.env.RATE_LIMIT_AUTH_MAX ? parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGeneratorFn,
  handler: (req, res) => {
    try {
      console.warn(`[RATE LIMIT][AUTH] ip=${req.ip} user=${req.user ? req.user.sub : 'anon'} method=${req.method} url=${req.originalUrl}`);
    } catch (e) {
      console.warn('[RATE LIMIT][AUTH] hit, could not log details');
    }
    res.set('Retry-After', Math.ceil(RATE_WINDOW_MS / 1000));
    return res.status(429).json({ error: 'rate_limited', message: 'Too many requests (auth)' });
  }
});

// Mount auth limiter specifically on auth routes
app.use('/api/auth', authLimiter);

// Global API limiter — but skip auth routes (they use authLimiter)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth')) return next();
  if (!req.path.startsWith('/api/')) return next();
  const importKey = process.env.IMPORT_API_KEY;
  const importHeader = req.header('x-import-key');
  if (importKey && importHeader && importHeader === importKey) return next();
  if (req.method === 'GET' || req.method === 'HEAD') {
    return apiReadLimiter(req, res, next);
  }
  return apiLimiter(req, res, next);
});


const LOG_REQUESTS = (process.env.LOG_REQUESTS || '').toLowerCase() === 'true';
if (LOG_REQUESTS) {
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[req] ${req.method} ${req.path}`, { query: req.query, body: req.body });
    }
    next();
  });
}

const isProductionRuntime = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
const dbTarget = (process.env.DB_TARGET || '').toLowerCase(); // local | remote
const DATABASE_URL_SELECTED = (() => {
  if (dbTarget === 'local') return process.env.DATABASE_URL_LOCAL;
  if (dbTarget === 'remote') return process.env.DATABASE_URL;
  if (isProductionRuntime) return process.env.DATABASE_URL;
  return process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
})();
const forcePgSsl = (process.env.PG_FORCE_SSL || '').toLowerCase() === 'true';
const disablePgSsl = (process.env.PG_DISABLE_SSL || '').toLowerCase() === 'true';
const usePgSsl = (() => {
  if (disablePgSsl) return false;
  if (forcePgSsl) return true;
  try {
    if (!DATABASE_URL_SELECTED) return false;
    const u = new URL(DATABASE_URL_SELECTED);
    const host = (u.hostname || '').toLowerCase();
    const sslmode = (u.searchParams.get('sslmode') || '').toLowerCase();
    if (sslmode) return true;
    if (host === 'localhost' || host === '127.0.0.1') return false;
    if (dbTarget === 'local') return false;
    return isProductionRuntime || dbTarget === 'remote';
  } catch {
    return isProductionRuntime;
  }
})();
const pool = DATABASE_URL_SELECTED ? new Pool({
  connectionString: DATABASE_URL_SELECTED,
  ssl: usePgSsl ? { rejectUnauthorized: false } : false,
  // Tunables to improve resiliency on flaky networks or DB failovers
  max: process.env.PG_MAX_CLIENTS ? parseInt(process.env.PG_MAX_CLIENTS, 10) : 10,
  idleTimeoutMillis: process.env.PG_IDLE_TIMEOUT_MS ? parseInt(process.env.PG_IDLE_TIMEOUT_MS, 10) : 30000,
  connectionTimeoutMillis: process.env.PG_CONN_TIMEOUT_MS ? parseInt(process.env.PG_CONN_TIMEOUT_MS, 10) : 10000,
}) : null;
// Protect against unhandled pool errors (connection reset, termination, etc.)
if (pool) {
  pool.on('error', (err, client) => {
    try {
      console.error('[PG POOL ERROR] Unhandled error on idle client', err && (err.stack || err.message || String(err)));
    } catch (e) { }
  });
  pool.on('connect', (client) => {
    try { console.log('[PG POOL] client connected'); } catch (e) { }
  });
  pool.on('remove', (client) => {
    try { console.log('[PG POOL] client removed'); } catch (e) { }
  });
}
try {
  if (DATABASE_URL_SELECTED) {
    const u = new URL(DATABASE_URL_SELECTED);
    const source = dbTarget || (isProductionRuntime ? 'remote' : (process.env.DATABASE_URL_LOCAL ? 'local' : 'remote'));
    console.log('DB source selected:', source);
    console.log('DB SSL enabled:', usePgSsl);
    console.log('DB connection target:', { user: u.username, host: u.hostname, port: u.port, database: u.pathname.replace('/', '') });
  } else {
    console.log('DB connection target: no DATABASE_URL/DATABASE_URL_LOCAL set');
  }
} catch {
  // ignore
}

// Ensure legacy column `fotos_empreendimento` exists so older DBs keep working
if (pool) {
  (async () => {
    try {
      await pool.query("ALTER TABLE IF EXISTS public.empreendimentos ADD COLUMN IF NOT EXISTS fotos_empreendimento JSONB DEFAULT '[]'::jsonb;");
      console.log('[DB] ensured fotos_empreendimento column exists');
    } catch (err) {
      try { console.warn('[DB] could not ensure fotos_empreendimento column:', err && (err.message || String(err))); } catch (e) { }
    }
  })();

  // Ensure relatorios_saida has all expected columns in legacy databases.
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.relatorios_saida (
          id BIGSERIAL PRIMARY KEY,
          id_formulario BIGINT REFERENCES public.formularios_vistoria(id) ON DELETE SET NULL,
          id_unidade BIGINT NOT NULL REFERENCES public.unidades_empreendimento(id) ON DELETE CASCADE,
          id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
          estrutura_formulario JSONB,
          nome_relatorio TEXT NOT NULL,
          nome_arquivo TEXT,
          data_saida DATE,
          data_segunda_vistoria DATE,
          data_relatorio DATE,
          consultor_responsavel TEXT,
          locatario TEXT,
          endereco_capa TEXT,
          subtitulo_capa TEXT,
          unidade_exibicao TEXT,
          representantes TEXT,
          texto_os_proposta TEXT,
          revisao TEXT,
          respostas JSONB,
          fotos_secoes JSONB,
          status_saida TEXT DEFAULT 'Em Andamento',
          observacoes_secoes JSONB,
          checklist_inicial JSONB,
          descricao_geral_adequacoes JSONB,
          detalhamento_adequacoes JSONB,
          declaracoes JSONB,
          consideracoes_finais TEXT,
          assinaturas JSONB,
          created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        )
      `);

      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS id_formulario BIGINT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS id_unidade BIGINT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS id_empreendimento BIGINT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS estrutura_formulario JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS nome_relatorio TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS nome_arquivo TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS data_saida DATE`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS data_segunda_vistoria DATE`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS data_relatorio DATE`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS consultor_responsavel TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS locatario TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS endereco_capa TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS subtitulo_capa TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS unidade_exibicao TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS representantes TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS texto_os_proposta TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS revisao TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS respostas JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS fotos_secoes JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS status_saida TEXT DEFAULT 'Em Andamento'`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS observacoes_secoes JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS checklist_inicial JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS descricao_geral_adequacoes JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS detalhamento_adequacoes JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS declaracoes JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS consideracoes_finais TEXT`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS assinaturas JSONB`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`);
      await pool.query(`ALTER TABLE IF EXISTS public.relatorios_saida ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`);

      console.log('[DB] ensured relatorios_saida schema columns exist');
    } catch (err) {
      try { console.warn('[DB] could not ensure relatorios_saida schema:', err && (err.message || String(err))); } catch (e) { }
    }
  })();

  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.atividades (
          id BIGSERIAL PRIMARY KEY,
          funcao TEXT,
          descricao_atividade TEXT NOT NULL,
          recorrencia TEXT,
          frequencia TEXT,
          tempo_estimado_horas NUMERIC(10,2),
          id_empreendimento BIGINT,
          nome_empreendimento TEXT,
          id_unidade BIGINT,
          nome_unidade TEXT,
          created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.atividades_planejamento (
          id BIGSERIAL PRIMARY KEY,
          titulo_atividade TEXT NOT NULL,
          descricao_atividade TEXT,
          responsavel_email TEXT,
          responsavel_nome TEXT,
          data_inicio TIMESTAMPTZ,
          data_prazo TIMESTAMPTZ,
          data_conclusao TIMESTAMPTZ,
          prioridade TEXT,
          tipo_atividade TEXT,
          status_atividade TEXT,
          id_empreendimento BIGINT,
          nome_empreendimento TEXT,
          id_unidade BIGINT,
          nome_unidade TEXT,
          horas_estimadas NUMERIC(10,2),
          horas_realizadas NUMERIC(10,2),
          observacoes TEXT,
          recorrencia TEXT,
          frequencia TEXT,
          created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.execucoes (
          id BIGSERIAL PRIMARY KEY,
          id_atividade_planejamento BIGINT,
          titulo_atividade TEXT,
          id_empreendimento BIGINT,
          nome_empreendimento TEXT,
          id_unidade BIGINT,
          nome_pavimento TEXT,
          usuario_email TEXT,
          usuario_nome TEXT,
          data_inicio TIMESTAMPTZ,
          data_termino TIMESTAMPTZ,
          status_execucao TEXT,
          tipo_atividade TEXT,
          pausas JSONB DEFAULT '[]'::jsonb,
          tempo_total_minutos INTEGER,
          tempo_total_horas NUMERIC(10,2),
          created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
      `);
      await pool.query("CREATE TRIGGER atividades_set_updated_at BEFORE UPDATE ON public.atividades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();").catch(() => {});
      await pool.query("CREATE TRIGGER atividades_planejamento_set_updated_at BEFORE UPDATE ON public.atividades_planejamento FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();").catch(() => {});
      await pool.query("CREATE TRIGGER execucoes_set_updated_at BEFORE UPDATE ON public.execucoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();").catch(() => {});
      await pool.query("CREATE INDEX IF NOT EXISTS idx_atividades_funcao ON public.atividades (funcao);").catch(() => {});
      await pool.query("CREATE INDEX IF NOT EXISTS idx_atividades_planejamento_responsavel ON public.atividades_planejamento (responsavel_email);").catch(() => {});
      await pool.query("CREATE INDEX IF NOT EXISTS idx_atividades_planejamento_status ON public.atividades_planejamento (status_atividade);").catch(() => {});
      await pool.query("CREATE INDEX IF NOT EXISTS idx_execucoes_atividade ON public.execucoes (id_atividade_planejamento);").catch(() => {});
      console.log('[DB] ensured planning tables exist');
    } catch (err) {
      try { console.warn('[DB] could not ensure planning tables:', err && (err.message || String(err))); } catch (e) { }
    }
  })();
}

// Global safety: log unhandled rejections/exceptions to avoid process crash during transient DB issues
process.on('unhandledRejection', (reason, promise) => {
  try {
    console.error('[UNHANDLED REJECTION]', reason && (reason.stack || reason.message || String(reason)));
  } catch (e) { }
});
process.on('uncaughtException', (err) => {
  try {
    console.error('[UNCAUGHT EXCEPTION]', err && (err.stack || err.message || String(err)));
    // don't exit — prefer to keep server running for resiliency in dev
  } catch (e) { }
});

// ===== Arquivos estáticos de upload =====
const uploadRoot = path.resolve(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
} catch { }
// NOTE: don't serve uploads as static files. Use authenticated/validated route below.

// Configuração do multer para uploads em memória (não em disco)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB (increase to handle larger photos from devices)
});

// Endpoint administrativo para comprimir imagens em uploads/
app.post('/api/compress-uploads', async (req, res) => {
  // Only allow in non-public contexts or protect with auth in production
  try {
    const uploadsPath = uploadRoot;
    if (!fs.existsSync(uploadsPath)) return res.status(404).json({ error: 'uploads_not_found' });

    const files = fs.readdirSync(uploadsPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.jfif'].includes(ext);
    });

    if (files.length === 0) return res.json({ ok: true, processed: 0 });

    // dynamic import to avoid crash if sharp not installed
    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch (err) {
      console.error('sharp not available:', err && err.message);
      return res.status(500).json({ error: 'sharp_not_installed' });
    }

    const results = [];
    for (const file of files) {
      const full = path.join(uploadsPath, file);
      try {
        const stat = fs.statSync(full);
        const bak = full + '.bak';
        if (!fs.existsSync(bak)) fs.copyFileSync(full, bak);

        const image = sharp(full);
        const metadata = await image.metadata();
        let pipeline = image;
        if (metadata.width && metadata.width > 1600) pipeline = pipeline.resize({ width: 1600 });
        pipeline = pipeline.jpeg({ quality: 78, mozjpeg: true });
        await pipeline.toFile(full + '.tmp');
        const statAfter = fs.statSync(full + '.tmp');
        fs.renameSync(full + '.tmp', full);
        results.push({ file, before: stat.size, after: statAfter.size });
      } catch (err) {
        console.error('compress upload failed', file, err && err.message);
      }
    }

    return res.json({ ok: true, processed: results.length, details: results });
  } catch (err) {
    console.error('compress-uploads error', err && (err.stack || err.message || String(err)));
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Fallback de desenvolvimento quando o banco não está acessível
const memory = {
  empreendimentos: [],
  unidades_empreendimento: [],
  usuarios: [],
  diarios_obra: [],
  atividades: [],
  atividades_planejamento: [],
  execucoes: [],
  vistorias_terminalidade: [],
  nao_conformidades: [],
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
  // Transient PG conditions (failover / terminated connection) — treat as temporary
  if (msg.toLowerCase().includes('terminated unexpectedly')) return true;
  if (msg.toLowerCase().includes('connection terminated')) return true;
  if (msg.toLowerCase().includes('in recovery')) return true;
  if (msg.toLowerCase().includes('not yet accepting') || msg.toLowerCase().includes('not accepting')) return true;
  if (code === '57P01' || code === '57P03') return true;
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

// Util: formata valor de data/timestamp retornado pelo PG para ISO com horário zero (UTC)
function formatDateForAPI(val) {
  if (val === null || val === undefined) return null;
  try {
    // Se já for string no formato YYYY-MM-DD
    if (typeof val === 'string') {
      const m = String(val).match(/^(\d{4}-\d{2}-\d{2})$/);
      if (m) return `${m[1]}T00:00:00.000Z`;
      // se for ISO-like, retorna como está
      if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return val;
    }
    // Se for Date object, construir midnight UTC
    if (val instanceof Date) {
      const y = val.getUTCFullYear();
      const m = String(val.getUTCMonth() + 1).padStart(2, '0');
      const d = String(val.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}T00:00:00.000Z`;
    }
    // fallback: try to coerce and parse
    const s = String(val);
    const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m2 ? `${m2[1]}T00:00:00.000Z` : null;
  } catch {
    return null;
  }
}

// Util: retorna string YYYY-MM-DD (útil para inputs type=date)
function dateOnlyForInput(val) {
  if (val === null || val === undefined) return null;
  try {
    if (typeof val === 'string') {
      const m = String(val).match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
    if (val instanceof Date) {
      const y = val.getUTCFullYear();
      const m = String(val.getUTCMonth() + 1).padStart(2, '0');
      const d = String(val.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(val);
    const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m2 ? m2[1] : null;
  } catch {
    return null;
  }
}

// ====== Auth helpers (JWT HS256 + PBKDF2) ======
// Read JWT secret from env; do not hardcode defaults here. In production JWT_SECRET must be set.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET is not set. Set environment variable JWT_SECRET and restart.');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.warn('Warning: JWT_SECRET not set — running without a signing secret (development only).');
}
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

// Enable gzip compression for API responses and static assets
app.use(compression());

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
    const healthInfo = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development',
      db: { ok: false, message: "DATABASE_URL not set" }
    };

    if (!pool) {
      return res.json(healthInfo);
    }

    try {
      const result = await pool.query("SELECT 1 AS ok");
      healthInfo.db = { ok: true, value: result.rows[0].ok };
      res.json(healthInfo);
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      const code = dbErr && typeof dbErr === 'object' && 'code' in dbErr ? dbErr.code : undefined;
      healthInfo.db = { ok: false, error: msg, code };
      res.json(healthInfo);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: "error", error: msg });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const healthInfo = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development',
      db: { ok: false, message: "DATABASE_URL not set" }
    };

    if (!pool) {
      return res.json(healthInfo);
    }

    try {
      const result = await pool.query("SELECT 1 AS ok");
      healthInfo.db = { ok: true, value: result.rows[0].ok };
      res.json(healthInfo);
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      const code = dbErr && typeof dbErr === 'object' && 'code' in dbErr ? dbErr.code : undefined;
      healthInfo.db = { ok: false, error: msg, code };
      res.json(healthInfo);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: "error", error: msg });
  }
});

// Endpoint de teste de CORS
app.get('/api/cors-test', (_req, res) => {
  res.json({
    message: "CORS está funcionando!",
    timestamp: new Date().toISOString(),
    headers: {
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers')
    }
  });
});

// Root endpoint to avoid "Cannot GET /"
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'fitout-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Helper to ensure pool exists
function requirePool() {
  if (!pool) throw new Error("DATABASE_URL not set");
  return pool;
}

// Upload de arquivo: salva no banco de dados PostgreSQL
// Security: validate mime types, size enforced by multer limits, sanitize names
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    // Quick debug log for uploads
    try { console.log('[UPLOAD] incoming file:', req.file && req.file.originalname, req.file && req.file.mimetype, req.file && req.file.size); } catch (e) { }
    if (!req.file) return res.status(400).json({ error: 'missing_file' });

    // Allow any image/* mimetype and PDFs — be permissive to avoid rejecting valid browser types
    if (!(req.file.mimetype && (req.file.mimetype.startsWith('image/') || req.file.mimetype === 'application/pdf'))) {
      return res.status(400).json({ error: 'invalid_mime_type', mimetype: req.file.mimetype });
    }

    // sanitize original name
    const originalName = String(req.file.originalname || '').replace(/\"/g, '').slice(0, 255);

    const p = pool ? pool : null;

    // Helper to persist to disk when DB unavailable
    async function saveToDiskFallback(buffer, origName, mime) {
      try {
        const ext = path.extname(origName) || '';
        const safeBase = String(Date.now()) + '-' + crypto.randomBytes(6).toString('hex');
        const filename = safeBase + ext;
        const full = path.join(uploadRoot, filename);
        await fs.promises.writeFile(full, buffer);
        console.warn(`⚠️ Saved upload to disk fallback: ${full}`);
        const url = `${getServerBaseUrl()}/api/uploads/disk/${encodeURIComponent(filename)}`;
        return { filename, full, url };
      } catch (e) {
        console.error('Failed to save to disk fallback', e && (e.stack || e.message || String(e)));
        throw e;
      }
    }

    // Try DB first if pool available
    if (p) {
      try {
        // Cria tabela se não existir
        await p.query(`
          CREATE TABLE IF NOT EXISTS arquivos (
            id SERIAL PRIMARY KEY,
            nome_original VARCHAR(255),
            mime_type VARCHAR(100),
            tamanho INTEGER,
            dados BYTEA,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);

        const { rows } = await p.query(
          `INSERT INTO arquivos (nome_original, mime_type, tamanho, dados) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [originalName, req.file.mimetype, req.file.size, req.file.buffer]
        );

        const fileId = rows[0].id;
        const file_path = `/api/files/${fileId}`;
        const file_url = `${getServerBaseUrl()}${file_path}`;

        console.log(`✅ Arquivo salvo: ID ${fileId} → ${file_url}`);

        return res.status(201).json({
          file_url,
          file_path,
          id: fileId,
          name: req.file.originalname,
          size: req.file.size,
          mime_type: req.file.mimetype
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Erro ao fazer upload: ', msg);
        // If Postgres connection terminated or DB in recovery, fall back to disk
        const low = String(msg || '').toLowerCase();
        if (low.includes('terminated unexpectedly') || low.includes('in recovery') || low.includes('not yet accepting') || low.includes('57p03') || low.includes('connection terminated')) {
          try {
            const saved = await saveToDiskFallback(req.file.buffer, originalName, req.file.mimetype);
            return res.status(201).json({
              fallback: 'disk',
              file_url: saved.url,
              filename: saved.filename,
              name: req.file.originalname,
              size: req.file.size,
              mime_type: req.file.mimetype,
              message: 'saved_to_disk_due_db_unavailable'
            });
          } catch (e) {
            console.error('disk fallback failed', e && (e.stack || e.message || String(e)));
            return res.status(500).json({ error: 'disk_fallback_failed', message: String(e && e.message ? e.message : e) });
          }
        }
        // not a known transient DB condition – return error
        return res.status(500).json({ error: msg });
      }
    }

    // No pool configured – persist to disk
    const saved = await saveToDiskFallback(req.file.buffer, originalName, req.file.mimetype);
    return res.status(201).json({
      fallback: 'disk',
      file_url: saved.url,
      filename: saved.filename,
      name: req.file.originalname,
      size: req.file.size,
      mime_type: req.file.mimetype,
      message: 'saved_to_disk_no_db'
    });
  } catch (err) {
    console.error('Erro ao fazer upload (outer):', err && (err.stack || err.message || String(err)));
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Fallback: tentar servir arquivos antigos da pasta uploads (se existirem)
app.get('/uploads/:filename', (req, res) => {
  console.warn(`⚠️ Tentativa de acessar arquivo antigo: /uploads/${req.params.filename}`);
  res.status(410).json({
    error: 'file_migrated',
    message: 'Este arquivo foi criado antes da migração para banco de dados e não está mais disponível. Por favor, faça upload novamente.'
  });
});

// Serve disk-stored uploads created as fallback during DB outage
app.get('/api/uploads/disk/:filename', (req, res) => {
  try {
    // Open CORS for images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    const filename = String(req.params.filename || '');
    // Prevent path traversal
    if (filename.includes('..') || path.isAbsolute(filename)) return res.status(400).json({ error: 'invalid_filename' });
    const full = path.join(uploadRoot, filename);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'file_not_found' });
    const stream = fs.createReadStream(full);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    const lower = filename.toLowerCase();
    const mimeType = lower.endsWith('.png') ? 'image/png' : (lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream');
    res.setHeader('Content-Type', mimeType);
    return stream.pipe(res);
  } catch (err) {
    console.error('Error serving disk upload', err && (err.stack || err.message || String(err)));
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Map DB row to API payload
function mapRelatorioRow(row) {
  // Converte URLs relativas em absolutas para fotos
  let fotos = row.fotos;
  if (fotos && Array.isArray(fotos)) {
    const baseUrl = getServerBaseUrl();
    fotos = fotos.map(foto => {
      if (foto.url && foto.url.startsWith('/api/')) {
        return { ...foto, url: `${baseUrl}${foto.url}` };
      }
      return foto;
    });
  }

  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    numero_relatorio: row.numero_relatorio,
    nome_arquivo: row.nome_arquivo,
    data_inicio_semana: formatDateForAPI(row.data_inicio_semana),
    data_fim_semana: formatDateForAPI(row.data_fim_semana),
    fisico_real_total: row.fisico_real_total,
    efetivo: row.efetivo,
    avanco_fisico_acumulado: row.avanco_fisico_acumulado,
    avanco_financeiro_acumulado: row.avanco_financeiro_acumulado,
    principais_atividades_semana: row.principais_atividades_semana,
    atividades_proxima_semana_tabela: row.atividades_proxima_semana_tabela,
    caminho_critico: row.caminho_critico,
    impedimentos: row.impedimentos,
    fotos: fotos,
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
  const allowed = new Set(['created_at', 'data_inicio_semana', 'data_fim_semana', 'numero_relatorio', 'id', 'data_inspecao', 'data_vistoria', 'revisao']);
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
    if ((process.env.DEBUG_INSPECOES || '').toLowerCase() === 'true') {
      try {
        console.log('[DEBUG][inspecoes-ar-condicionado] sql:', sql);
        console.log('[DEBUG][inspecoes-ar-condicionado] params:', params);
      } catch (e) {
        console.log('[DEBUG][inspecoes-ar-condicionado] failed to log debug info', e && (e.stack || e.message || String(e)));
      }
    }
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
    data_vistoria: formatDateForAPI(row.data_vistoria),
    data_relatorio: formatDateForAPI(row.data_relatorio),
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

// Map termo de aceite row
function mapTermoRow(row) {
  return {
    id: row.id,
    id_formulario: row.id_formulario,
    id_unidade: row.id_unidade,
    id_empreendimento: row.id_empreendimento,
    estrutura_formulario: row.estrutura_formulario,
    nome_termo: row.nome_termo,
    nome_arquivo: row.nome_arquivo,
    data_termo: formatDateForAPI(row.data_termo),
    data_relatorio: formatDateForAPI(row.data_relatorio),
    consultor_responsavel: row.consultor_responsavel,
    participantes: row.participantes,
    texto_os_proposta: row.texto_os_proposta,
    texto_escopo_consultoria: row.texto_escopo_consultoria,
    revisao: row.revisao,
    respostas: row.respostas,
    fotos_secoes: row.fotos_secoes,
    status_termo: row.status_termo,
    observacoes_secoes: row.observacoes_secoes,
    assinaturas: row.assinaturas,
    created_at: row.created_date || row.created_at,
    updated_at: row.updated_date || row.updated_at,
  };
}

function mapRelatorioSaidaRow(row) {
  return {
    id: row.id,
    id_formulario: row.id_formulario,
    id_unidade: row.id_unidade,
    id_empreendimento: row.id_empreendimento,
    estrutura_formulario: row.estrutura_formulario,
    nome_relatorio: row.nome_relatorio,
    nome_arquivo: row.nome_arquivo,
    data_saida: formatDateForAPI(row.data_saida),
    data_segunda_vistoria: formatDateForAPI(row.data_segunda_vistoria),
    data_relatorio: formatDateForAPI(row.data_relatorio),
    consultor_responsavel: row.consultor_responsavel,
    locatario: row.locatario,
    endereco_capa: row.endereco_capa,
    subtitulo_capa: row.subtitulo_capa,
    unidade_exibicao: row.unidade_exibicao,
    representantes: row.representantes,
    texto_os_proposta: row.texto_os_proposta,
    revisao: row.revisao,
    respostas: row.respostas,
    fotos_secoes: row.fotos_secoes,
    status_saida: row.status_saida,
    observacoes_secoes: row.observacoes_secoes,
    checklist_inicial: row.checklist_inicial,
    descricao_geral_adequacoes: row.descricao_geral_adequacoes,
    detalhamento_adequacoes: row.detalhamento_adequacoes,
    declaracoes: row.declaracoes,
    consideracoes_finais: row.consideracoes_finais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// CRUD routes for termos de aceite
app.get('/api/termos-aceite', async (req, res) => {
  try {
    const p = requirePool();
    const { id_unidade, id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_unidade) { where.push('id_unidade = $' + (params.length + 1)); params.push(Number(id_unidade)); }
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.termos_aceite ${whereClause} ${orderClause}`;
    // Logging to aid debugging when registros existentes não aparecem
    console.log('[/api/termos-aceite] SQL:', sql);
    console.log('[/api/termos-aceite] params:', params);
    const { rows } = await p.query(sql, params);
    console.log('[/api/termos-aceite] rows returned:', rows.length);
    res.json(rows.map(mapTermoRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

// DEBUG: endpoint temporário para inspecionar registros brutos de termos_aceite por empreendimento
app.get('/api/debug/termos-aceite/:id_empreendimento', async (req, res) => {
  try {
    const p = requirePool();
    const idEmp = Number(req.params.id_empreendimento);
    const { rows } = await p.query('SELECT * FROM public.termos_aceite WHERE id_empreendimento = $1 ORDER BY id', [idEmp]);
    return res.json({ ok: true, count: rows.length, rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg, stack: err && err.stack ? err.stack : null });
  }
});

app.get('/api/termos-aceite/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.termos_aceite WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapTermoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/termos-aceite', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.termos_aceite (
      id_formulario, id_unidade, id_empreendimento, estrutura_formulario, nome_termo, nome_arquivo,
      data_termo, data_relatorio, consultor_responsavel, participantes, texto_os_proposta,
      texto_escopo_consultoria, revisao, respostas, fotos_secoes, status_termo, observacoes_secoes, assinaturas, created_date, updated_date
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now(), now()
    ) RETURNING *`;
    const params = [
      b.id_formulario ?? null,
      b.id_unidade ?? null,
      b.id_empreendimento ?? null,
      toJson(b.estrutura_formulario ?? null),
      b.nome_termo ?? null,
      b.nome_arquivo ?? null,
      normalizeDate(b.data_termo) ?? null,
      normalizeDate(b.data_relatorio) ?? null,
      b.consultor_responsavel ?? null,
      toJson(b.participantes ?? null),
      b.texto_os_proposta ?? null,
      b.texto_escopo_consultoria ?? null,
      b.revisao ?? null,
      toJson(b.respostas ?? {}),
      toJson(b.fotos_secoes ?? []),
      b.status_termo ?? 'Em Andamento',
      toJson(b.observacoes_secoes ?? {}),
      toJson(b.assinaturas ?? []),
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapTermoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.put('/api/termos-aceite/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.termos_aceite SET
      id_formulario = COALESCE($1, id_formulario),
      id_unidade = COALESCE($2, id_unidade),
      id_empreendimento = COALESCE($3, id_empreendimento),
      estrutura_formulario = COALESCE($4, estrutura_formulario),
      nome_termo = COALESCE($5, nome_termo),
      nome_arquivo = COALESCE($6, nome_arquivo),
      data_termo = $7,
      data_relatorio = $8,
      consultor_responsavel = COALESCE($9, consultor_responsavel),
      participantes = COALESCE($10, participantes),
      texto_os_proposta = COALESCE($11, texto_os_proposta),
      texto_escopo_consultoria = COALESCE($12, texto_escopo_consultoria),
      revisao = COALESCE($13, revisao),
      respostas = COALESCE($14, respostas),
      fotos_secoes = COALESCE($15, fotos_secoes),
      status_termo = COALESCE($16, status_termo),
      observacoes_secoes = COALESCE($17, observacoes_secoes),
      assinaturas = COALESCE($18, assinaturas),
      updated_date = now()
    WHERE id = $19 RETURNING *`;
    const params = [
      b.id_formulario ?? null,
      b.id_unidade ?? null,
      b.id_empreendimento ?? null,
      toJson(b.estrutura_formulario ?? null),
      b.nome_termo ?? null,
      b.nome_arquivo ?? null,
      normalizeDate(b.data_termo) ?? null,
      normalizeDate(b.data_relatorio) ?? null,
      b.consultor_responsavel ?? null,
      toJson(b.participantes ?? null),
      b.texto_os_proposta ?? null,
      b.texto_escopo_consultoria ?? null,
      b.revisao ?? null,
      toJson(b.respostas ?? null),
      toJson(b.fotos_secoes ?? null),
      b.status_termo ?? null,
      toJson(b.observacoes_secoes ?? null),
      toJson(b.assinaturas ?? null),
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapTermoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Delete termo de aceite
app.delete('/api/termos-aceite/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    console.log('[/api/termos-aceite DELETE] requested id:', req.params.id, 'parsed id:', id);
    const { rows } = await p.query('DELETE FROM public.termos_aceite WHERE id = $1 RETURNING *', [id]);
    console.log('[/api/termos-aceite DELETE] rows returned:', rows ? rows.length : 0);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ ok: true, deleted: mapTermoRow(rows[0]) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// CRUD routes for relatorios de saida
app.get('/api/relatorios-saida', async (req, res) => {
  try {
    const p = requirePool();
    const { id, id_unidade, id_empreendimento, status_saida, order } = req.query;
    const where = [];
    const params = [];
    if (id) { where.push('id = $' + (params.length + 1)); params.push(Number(id)); }
    if (id_unidade) { where.push('id_unidade = $' + (params.length + 1)); params.push(Number(id_unidade)); }
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    if (status_saida) { where.push('status_saida = $' + (params.length + 1)); params.push(String(status_saida)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.relatorios_saida ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapRelatorioSaidaRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/relatorios-saida/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.relatorios_saida WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRelatorioSaidaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/relatorios-saida', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const idUnidade = Number(b.id_unidade);
    const idEmpreendimento = Number(b.id_empreendimento);
    const nomeRelatorio = String(b.nome_relatorio || '').trim();

    if (!Number.isFinite(idUnidade) || !Number.isFinite(idEmpreendimento) || !nomeRelatorio) {
      return res.status(400).json({
        error: 'invalid_payload',
        message: 'Campos obrigatorios: id_unidade, id_empreendimento e nome_relatorio.'
      });
    }

    const sql = `INSERT INTO public.relatorios_saida (
      id_formulario, id_unidade, id_empreendimento, estrutura_formulario, nome_relatorio, nome_arquivo,
      data_saida, data_segunda_vistoria, data_relatorio, consultor_responsavel, locatario, endereco_capa, subtitulo_capa,
      unidade_exibicao, representantes, texto_os_proposta, revisao, respostas, fotos_secoes,
      status_saida, observacoes_secoes, checklist_inicial, descricao_geral_adequacoes,
      detalhamento_adequacoes, declaracoes, consideracoes_finais, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
    ) RETURNING *`;
    const params = [
      b.id_formulario ?? null,
      idUnidade,
      idEmpreendimento,
      toJson(b.estrutura_formulario ?? null),
      nomeRelatorio,
      b.nome_arquivo ?? null,
      normalizeDate(b.data_saida) ?? null,
      normalizeDate(b.data_segunda_vistoria) ?? null,
      normalizeDate(b.data_relatorio) ?? null,
      b.consultor_responsavel ?? null,
      b.locatario ?? null,
      b.endereco_capa ?? null,
      b.subtitulo_capa ?? null,
      b.unidade_exibicao ?? null,
      b.representantes ?? null,
      b.texto_os_proposta ?? null,
      b.revisao ?? null,
      toJson(b.respostas ?? {}),
      toJson(b.fotos_secoes ?? {}),
      b.status_saida ?? 'Em Andamento',
      toJson(b.observacoes_secoes ?? {}),
      toJson(b.checklist_inicial ?? {}),
      toJson(b.descricao_geral_adequacoes ?? {}),
      toJson(b.detalhamento_adequacoes ?? {}),
      toJson(b.declaracoes ?? {}),
      b.consideracoes_finais ?? null,
      toJson(b.assinaturas ?? []),
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapRelatorioSaidaRow(rows[0]));
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    const constraint = err && typeof err === 'object' && 'constraint' in err ? err.constraint : undefined;
    if (code === '23503') {
      return res.status(400).json({
        error: 'foreign_key_violation',
        message: 'id_unidade ou id_empreendimento nao existe na base.',
        code,
        detail,
        constraint,
      });
    }
    if (code === '23502') {
      return res.status(400).json({
        error: 'not_null_violation',
        message: 'Campo obrigatorio ausente no payload.',
        code,
        detail,
        constraint,
      });
    }
    if (code === '42703') {
      return res.status(500).json({
        error: 'schema_mismatch',
        message: 'Banco de dados sem coluna esperada para relatorios_saida. Execute migracao/deploy do backend.',
        code,
        detail,
        constraint,
      });
    }
    if (code === '42P01') {
      return res.status(500).json({
        error: 'missing_table',
        message: 'Tabela relatorios_saida nao existe no banco. Execute migracao/deploy do backend.',
        code,
      });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/relatorios-saida POST] unexpected error', { code, detail, constraint, msg });
    res.status(500).json({ error: msg });
  }
});

app.put('/api/relatorios-saida/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.relatorios_saida SET
      id_formulario = COALESCE($1, id_formulario),
      id_unidade = COALESCE($2, id_unidade),
      id_empreendimento = COALESCE($3, id_empreendimento),
      estrutura_formulario = COALESCE($4, estrutura_formulario),
      nome_relatorio = COALESCE($5, nome_relatorio),
      nome_arquivo = COALESCE($6, nome_arquivo),
      data_saida = $7,
      data_segunda_vistoria = $8,
      data_relatorio = $9,
      consultor_responsavel = COALESCE($10, consultor_responsavel),
      locatario = COALESCE($11, locatario),
      endereco_capa = COALESCE($12, endereco_capa),
      subtitulo_capa = COALESCE($13, subtitulo_capa),
      unidade_exibicao = COALESCE($14, unidade_exibicao),
      representantes = COALESCE($15, representantes),
      texto_os_proposta = COALESCE($16, texto_os_proposta),
      revisao = COALESCE($17, revisao),
      respostas = COALESCE($18, respostas),
      fotos_secoes = COALESCE($19, fotos_secoes),
      status_saida = COALESCE($20, status_saida),
      observacoes_secoes = COALESCE($21, observacoes_secoes),
      checklist_inicial = COALESCE($22, checklist_inicial),
      descricao_geral_adequacoes = COALESCE($23, descricao_geral_adequacoes),
      detalhamento_adequacoes = COALESCE($24, detalhamento_adequacoes),
      declaracoes = COALESCE($25, declaracoes),
      consideracoes_finais = COALESCE($26, consideracoes_finais),
      assinaturas = COALESCE($27, assinaturas),
      updated_at = now()
    WHERE id = $28 RETURNING *`;
    const params = [
      b.id_formulario ?? null,
      b.id_unidade ?? null,
      b.id_empreendimento ?? null,
      toJson(b.estrutura_formulario ?? null),
      b.nome_relatorio ?? null,
      b.nome_arquivo ?? null,
      normalizeDate(b.data_saida) ?? null,
      normalizeDate(b.data_segunda_vistoria) ?? null,
      normalizeDate(b.data_relatorio) ?? null,
      b.consultor_responsavel ?? null,
      b.locatario ?? null,
      b.endereco_capa ?? null,
      b.subtitulo_capa ?? null,
      b.unidade_exibicao ?? null,
      b.representantes ?? null,
      b.texto_os_proposta ?? null,
      b.revisao ?? null,
      toJson(b.respostas ?? null),
      toJson(b.fotos_secoes ?? null),
      b.status_saida ?? null,
      toJson(b.observacoes_secoes ?? null),
      toJson(b.checklist_inicial ?? null),
      toJson(b.descricao_geral_adequacoes ?? null),
      toJson(b.detalhamento_adequacoes ?? null),
      toJson(b.declaracoes ?? null),
      b.consideracoes_finais ?? null,
      toJson(b.assinaturas ?? null),
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRelatorioSaidaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.delete('/api/relatorios-saida/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('DELETE FROM public.relatorios_saida WHERE id = $1 RETURNING *', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ ok: true, deleted: mapRelatorioSaidaRow(rows[0]) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});


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
      b.id_empreendimento,
      b.numero_relatorio,
      b.nome_arquivo,
      normalizeDate(b.data_inicio_semana) ?? null,
      normalizeDate(b.data_fim_semana) ?? null,
      b.fisico_real_total ?? null,
      b.efetivo ?? null,
      b.avanco_fisico_acumulado ?? null,
      b.avanco_financeiro_acumulado ?? null,
      b.principais_atividades_semana ?? null,
      b.atividades_proxima_semana_tabela ?? null,
      b.caminho_critico ?? null,
      b.impedimentos ?? null,
      b.fotos ?? null,
      b.vistos ?? null,
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
    data_inspecao: formatDateForAPI(row.data_inspecao),
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

// ===== Inspeções Hidráulica =====
let inspecaoHidraulicaSchemaEnsured = false;

async function ensureInspecaoHidraulicaSchema() {
  if (inspecaoHidraulicaSchemaEnsured) return;

  const p = requirePool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.inspecoes_hidraulica (
      id BIGSERIAL PRIMARY KEY,
      id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
      data_inspecao DATE,
      titulo_capa TEXT,
      subtitulo_capa TEXT,
      texto_rodape_capa TEXT,
      titulo_relatorio TEXT,
      subtitulo_relatorio TEXT,
      cliente TEXT,
      revisao TEXT,
      eng_responsavel TEXT,
      nome_arquivo TEXT,
      itens_documentacao JSONB,
      comentarios_documentacao TEXT,
      locais JSONB,
      observacoes_gerais TEXT,
      conclusao_r01 TEXT,
      conclusao_r02 TEXT,
      assinaturas JSONB,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS data_inspecao DATE`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS titulo_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS subtitulo_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS texto_rodape_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS titulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS subtitulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS cliente TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS revisao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS eng_responsavel TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS nome_arquivo TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS itens_documentacao JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS comentarios_documentacao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS locais JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS conclusao_r01 TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS conclusao_r02 TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS assinaturas JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`ALTER TABLE public.inspecoes_hidraulica ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'inspecoes_hidraulica_id_empreendimento_fkey'
      ) THEN
        ALTER TABLE public.inspecoes_hidraulica
        ADD CONSTRAINT inspecoes_hidraulica_id_empreendimento_fkey
        FOREIGN KEY (id_empreendimento) REFERENCES public.empreendimentos(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);
  await p.query('DROP TRIGGER IF EXISTS inspecoes_hidraulica_set_updated_at ON public.inspecoes_hidraulica');
  await p.query('CREATE TRIGGER inspecoes_hidraulica_set_updated_at BEFORE UPDATE ON public.inspecoes_hidraulica FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_hidraulica_empreendimento ON public.inspecoes_hidraulica (id_empreendimento)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_hidraulica_data ON public.inspecoes_hidraulica (data_inspecao)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_hidraulica_revisao ON public.inspecoes_hidraulica (revisao)');

  inspecaoHidraulicaSchemaEnsured = true;
}

function mapInspecaoHidraulicaRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: formatDateForAPI(row.data_inspecao),
    titulo_capa: row.titulo_capa,
    subtitulo_capa: row.subtitulo_capa,
    texto_rodape_capa: row.texto_rodape_capa,
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
    conclusao_r01: row.conclusao_r01,
    conclusao_r02: row.conclusao_r02,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Listar/filtrar
app.get('/api/inspecoes-hidraulica', async (req, res) => {
  try {
    await ensureInspecaoHidraulicaSchema();
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_hidraulica ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoHidraulicaRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

// Obter por ID
app.get('/api/inspecoes-hidraulica/:id', async (req, res) => {
  try {
    await ensureInspecaoHidraulicaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_hidraulica WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoHidraulicaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Criar
app.post('/api/inspecoes-hidraulica', async (req, res) => {
  try {
    await ensureInspecaoHidraulicaSchema();
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    console.log('[POST /api/inspecoes-hidraulica] body:', JSON.stringify(b).slice(0, 2000));
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
    const sql = `INSERT INTO public.inspecoes_hidraulica (
      id_empreendimento, data_inspecao, titulo_capa, subtitulo_capa, texto_rodape_capa,
      titulo_relatorio, subtitulo_relatorio, cliente, revisao, eng_responsavel, nome_arquivo,
      itens_documentacao, comentarios_documentacao, locais, observacoes_gerais, conclusao_r01, conclusao_r02, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14::jsonb,$15,$16,$17,$18::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? new Date().toISOString().slice(0, 10),
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
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
      b.conclusao_r01 ?? null,
      b.conclusao_r02 ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoHidraulicaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-hidraulica] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

// Atualizar
app.put('/api/inspecoes-hidraulica/:id', async (req, res) => {
  try {
    await ensureInspecaoHidraulicaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_hidraulica SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = COALESCE($2, data_inspecao),
      titulo_capa = $3,
      subtitulo_capa = $4,
      texto_rodape_capa = $5,
      titulo_relatorio = $6,
      subtitulo_relatorio = $7,
      cliente = $8,
      revisao = $9,
      eng_responsavel = $10,
      nome_arquivo = $11,
      itens_documentacao = $12::jsonb,
      comentarios_documentacao = $13,
      locais = $14::jsonb,
      observacoes_gerais = $15,
      conclusao_r01 = $16,
      conclusao_r02 = $17,
      assinaturas = $18::jsonb,
      updated_at = now()
    WHERE id = $19 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
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
      b.conclusao_r01 ?? null,
      b.conclusao_r02 ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoHidraulicaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-hidraulica/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

// Remover
app.delete('/api/inspecoes-hidraulica/:id', async (req, res) => {
  try {
    await ensureInspecaoHidraulicaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_hidraulica WHERE id = $1', [id]);
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
    data_inspecao: formatDateForAPI(row.data_inspecao),
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
    data_inspecao: formatDateForAPI(row.data_inspecao),
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
    data_inspecao: formatDateForAPI(row.data_inspecao),
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
      $1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22,$23::jsonb
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

// ===== Inspeções de Gás =====
let inspecaoGasSchemaEnsured = false;

async function ensureInspecaoGasSchema() {
  if (inspecaoGasSchemaEnsured) return;
  const p = requirePool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.inspecoes_gas (
      id BIGSERIAL PRIMARY KEY,
      id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
      data_inspecao DATE,
      titulo_capa TEXT,
      subtitulo_capa TEXT,
      texto_rodape_capa TEXT,
      titulo_relatorio TEXT,
      subtitulo_relatorio TEXT,
      cliente TEXT,
      revisao TEXT,
      eng_responsavel TEXT,
      nome_arquivo TEXT,
      itens_documentacao JSONB,
      comentarios_documentacao TEXT,
      locais JSONB,
      observacoes_gerais TEXT,
      conclusao_r01 TEXT,
      conclusao_r02 TEXT,
      assinaturas JSONB,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS data_inspecao DATE`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS titulo_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS subtitulo_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS texto_rodape_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS titulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS subtitulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS cliente TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS revisao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS eng_responsavel TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS nome_arquivo TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS itens_documentacao JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS comentarios_documentacao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS locais JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS conclusao_r01 TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS conclusao_r02 TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS assinaturas JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`ALTER TABLE public.inspecoes_gas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'inspecoes_gas_id_empreendimento_fkey'
      ) THEN
        ALTER TABLE public.inspecoes_gas
        ADD CONSTRAINT inspecoes_gas_id_empreendimento_fkey
        FOREIGN KEY (id_empreendimento) REFERENCES public.empreendimentos(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);
  await p.query('DROP TRIGGER IF EXISTS inspecoes_gas_set_updated_at ON public.inspecoes_gas');
  await p.query('CREATE TRIGGER inspecoes_gas_set_updated_at BEFORE UPDATE ON public.inspecoes_gas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_gas_empreendimento ON public.inspecoes_gas (id_empreendimento)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_gas_data ON public.inspecoes_gas (data_inspecao)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_gas_revisao ON public.inspecoes_gas (revisao)');
  inspecaoGasSchemaEnsured = true;
}

function mapInspecaoGasRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: formatDateForAPI(row.data_inspecao),
    titulo_capa: row.titulo_capa,
    subtitulo_capa: row.subtitulo_capa,
    texto_rodape_capa: row.texto_rodape_capa,
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
    conclusao_r01: row.conclusao_r01,
    conclusao_r02: row.conclusao_r02,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/inspecoes-gas', async (req, res) => {
  try {
    await ensureInspecaoGasSchema();
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_gas ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoGasRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-gas/:id', async (req, res) => {
  try {
    await ensureInspecaoGasSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_gas WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoGasRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-gas', async (req, res) => {
  try {
    await ensureInspecaoGasSchema();
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
    const sql = `INSERT INTO public.inspecoes_gas (
      id_empreendimento, data_inspecao, titulo_capa, subtitulo_capa, texto_rodape_capa,
      titulo_relatorio, subtitulo_relatorio, cliente, revisao, eng_responsavel, nome_arquivo,
      itens_documentacao, comentarios_documentacao, locais, observacoes_gerais, conclusao_r01, conclusao_r02, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14::jsonb,$15,$16,$17,$18::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? new Date().toISOString().slice(0, 10),
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
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
      b.conclusao_r01 ?? null,
      b.conclusao_r02 ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoGasRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-gas] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-gas/:id', async (req, res) => {
  try {
    await ensureInspecaoGasSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_gas SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      titulo_capa = $3,
      subtitulo_capa = $4,
      texto_rodape_capa = $5,
      titulo_relatorio = $6,
      subtitulo_relatorio = $7,
      cliente = $8,
      revisao = $9,
      eng_responsavel = $10,
      nome_arquivo = $11,
      itens_documentacao = $12::jsonb,
      comentarios_documentacao = $13,
      locais = $14::jsonb,
      observacoes_gerais = $15,
      conclusao_r01 = $16,
      conclusao_r02 = $17,
      assinaturas = $18::jsonb,
      updated_at = now()
    WHERE id = $19 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
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
      b.conclusao_r01 ?? null,
      b.conclusao_r02 ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoGasRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-gas/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-gas/:id', async (req, res) => {
  try {
    await ensureInspecaoGasSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_gas WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Vistorias Tecnicas =====
let vistoriaTecnicaSchemaEnsured = false;

async function ensureVistoriaTecnicaSchema() {
  if (vistoriaTecnicaSchemaEnsured) return;

  const p = requirePool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.vistorias_tecnicas (
      id BIGSERIAL PRIMARY KEY,
      id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
      data_vistoria DATE,
      titulo_capa TEXT,
      subtitulo_capa TEXT,
      texto_rodape_capa TEXT,
      titulo_vistoria TEXT,
      descricao_vistoria TEXT,
      titulo_relatorio TEXT,
      subtitulo_relatorio TEXT,
      cliente TEXT,
      endereco TEXT,
      revisao TEXT,
      eng_responsavel TEXT,
      nome_arquivo TEXT,
      foto_localizacao TEXT,
      layout_proposto_imagens JSONB,
      objetivo TEXT,
      instalacoes_geral TEXT,
      lista_documentos JSONB,
      normas_tecnicas JSONB,
      itens_documentacao JSONB,
      comentarios_documentacao TEXT,
      locais JSONB,
      quadros_gerais JSONB,
      elevadores_monta_carga JSONB,
      conclusao_final TEXT,
      conclusao TEXT,
      assinaturas JSONB,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);

  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS data_vistoria DATE`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS titulo_capa TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS subtitulo_capa TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS texto_rodape_capa TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS titulo_vistoria TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS descricao_vistoria TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS titulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS subtitulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS cliente TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS endereco TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS revisao TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS eng_responsavel TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS nome_arquivo TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS foto_localizacao TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS layout_proposto_imagens JSONB`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS objetivo TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS instalacoes_geral TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS lista_documentos JSONB`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS normas_tecnicas JSONB`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS itens_documentacao JSONB`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS comentarios_documentacao TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS locais JSONB`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS quadros_gerais JSONB`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS elevadores_monta_carga JSONB`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS conclusao_final TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS conclusao TEXT`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS assinaturas JSONB`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`ALTER TABLE public.vistorias_tecnicas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL`);

  await p.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'vistorias_tecnicas_id_empreendimento_fkey'
      ) THEN
        ALTER TABLE public.vistorias_tecnicas
        ADD CONSTRAINT vistorias_tecnicas_id_empreendimento_fkey
        FOREIGN KEY (id_empreendimento) REFERENCES public.empreendimentos(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await p.query('DROP TRIGGER IF EXISTS vistorias_tecnicas_set_updated_at ON public.vistorias_tecnicas');
  await p.query('CREATE TRIGGER vistorias_tecnicas_set_updated_at BEFORE UPDATE ON public.vistorias_tecnicas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');
  await p.query('CREATE INDEX IF NOT EXISTS idx_vistorias_tecnicas_empreendimento ON public.vistorias_tecnicas (id_empreendimento)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_vistorias_tecnicas_data ON public.vistorias_tecnicas (data_vistoria)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_vistorias_tecnicas_revisao ON public.vistorias_tecnicas (revisao)');

  vistoriaTecnicaSchemaEnsured = true;
}

function mapVistoriaTecnicaRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_vistoria: formatDateForAPI(row.data_vistoria),
    titulo_capa: row.titulo_capa,
    subtitulo_capa: row.subtitulo_capa,
    texto_rodape_capa: row.texto_rodape_capa,
    titulo_vistoria: row.titulo_vistoria,
    descricao_vistoria: row.descricao_vistoria,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    endereco: row.endereco,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    foto_localizacao: row.foto_localizacao,
    layout_proposto_imagens: row.layout_proposto_imagens,
    fotos_layout_proposto: row.layout_proposto_imagens,
    objetivo: row.objetivo,
    instalacoes_geral: row.instalacoes_geral,
    lista_documentos: row.lista_documentos,
    normas_tecnicas: row.normas_tecnicas,
    itens_documentacao: row.itens_documentacao,
    comentarios_documentacao: row.comentarios_documentacao,
    locais: row.locais,
    quadros_gerais: row.quadros_gerais,
    elevadores_monta_carga: row.elevadores_monta_carga,
    conclusao_final: row.conclusao_final,
    conclusao: row.conclusao,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/vistorias-tecnicas', async (req, res) => {
  try {
    await ensureVistoriaTecnicaSchema();
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) {
      where.push('id_empreendimento = $' + (params.length + 1));
      params.push(Number(id_empreendimento));
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.vistorias_tecnicas ${whereClause} ${orderClause}`, params);
    res.json(rows.map(mapVistoriaTecnicaRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/vistorias-tecnicas/:id', async (req, res) => {
  try {
    await ensureVistoriaTecnicaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.vistorias_tecnicas WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapVistoriaTecnicaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/vistorias-tecnicas', async (req, res) => {
  try {
    await ensureVistoriaTecnicaSchema();
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    const fotosLayoutProposto = b.fotos_layout_proposto ?? b.layout_proposto_imagens ?? [];
    const sql = `INSERT INTO public.vistorias_tecnicas (
      id_empreendimento, data_vistoria, titulo_capa, subtitulo_capa, texto_rodape_capa,
      titulo_vistoria, descricao_vistoria, titulo_relatorio, subtitulo_relatorio, cliente,
      endereco, revisao, eng_responsavel, nome_arquivo, foto_localizacao, layout_proposto_imagens,
      objetivo, instalacoes_geral, lista_documentos, normas_tecnicas, itens_documentacao,
      comentarios_documentacao, locais, quadros_gerais, elevadores_monta_carga,
      conclusao_final, conclusao, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20::jsonb,$21,$22::jsonb,$23::jsonb,$24::jsonb,$25,$26,$27,$28::jsonb
    ) RETURNING *`;
    const params = [
      Number(b.id_empreendimento),
      normalizeDate(b.data_vistoria) ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      b.titulo_vistoria ?? null,
      b.descricao_vistoria ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.endereco ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      b.foto_localizacao ?? null,
      toJson(fotosLayoutProposto),
      b.objetivo ?? null,
      b.instalacoes_geral ?? null,
      toJson(b.lista_documentos ?? []),
      toJson(b.normas_tecnicas ?? []),
      toJson(b.itens_documentacao ?? []),
      b.comentarios_documentacao ?? null,
      toJson(b.locais ?? []),
      toJson(b.quadros_gerais ?? []),
      toJson(b.elevadores_monta_carga ?? []),
      b.conclusao_final ?? null,
      b.conclusao ?? null,
      toJson(b.assinaturas ?? []),
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapVistoriaTecnicaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    res.status(500).json({ error: msg, code });
  }
});

app.put('/api/vistorias-tecnicas/:id', async (req, res) => {
  try {
    await ensureVistoriaTecnicaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const fotosLayoutProposto = b.fotos_layout_proposto ?? b.layout_proposto_imagens ?? [];
    const sql = `UPDATE public.vistorias_tecnicas SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_vistoria = $2,
      titulo_capa = $3,
      subtitulo_capa = $4,
      texto_rodape_capa = $5,
      titulo_vistoria = $6,
      descricao_vistoria = $7,
      titulo_relatorio = $8,
      subtitulo_relatorio = $9,
      cliente = $10,
      endereco = $11,
      revisao = $12,
      eng_responsavel = $13,
      nome_arquivo = $14,
      foto_localizacao = $15,
      layout_proposto_imagens = $16::jsonb,
      objetivo = $17,
      instalacoes_geral = $18,
      lista_documentos = $19::jsonb,
      normas_tecnicas = $20::jsonb,
      itens_documentacao = $21::jsonb,
      comentarios_documentacao = $22,
      locais = $23::jsonb,
      quadros_gerais = $24::jsonb,
      elevadores_monta_carga = $25::jsonb,
      conclusao_final = $26,
      conclusao = $27,
      assinaturas = $28::jsonb,
      updated_at = now()
    WHERE id = $29 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_vistoria) ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      b.titulo_vistoria ?? null,
      b.descricao_vistoria ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.endereco ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      b.foto_localizacao ?? null,
      toJson(fotosLayoutProposto),
      b.objetivo ?? null,
      b.instalacoes_geral ?? null,
      toJson(b.lista_documentos ?? []),
      toJson(b.normas_tecnicas ?? []),
      toJson(b.itens_documentacao ?? []),
      b.comentarios_documentacao ?? null,
      toJson(b.locais ?? []),
      toJson(b.quadros_gerais ?? []),
      toJson(b.elevadores_monta_carga ?? []),
      b.conclusao_final ?? null,
      b.conclusao ?? null,
      toJson(b.assinaturas ?? []),
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapVistoriaTecnicaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/vistorias-tecnicas/:id', async (req, res) => {
  try {
    await ensureVistoriaTecnicaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.vistorias_tecnicas WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ===== Inspeções Elétrica =====
let inspecaoEletricaSchemaEnsured = false;

async function ensureInspecaoEletricaSchema() {
  if (inspecaoEletricaSchemaEnsured) return;

  const p = requirePool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.inspecoes_eletrica (
      id BIGSERIAL PRIMARY KEY,
      id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
      data_inspecao DATE,
      titulo_capa TEXT,
      subtitulo_capa TEXT,
      texto_rodape_capa TEXT,
      titulo_inspecao TEXT,
      descricao_inspecao TEXT,
      titulo_relatorio TEXT,
      subtitulo_relatorio TEXT,
      cliente TEXT,
      revisao TEXT,
      eng_responsavel TEXT,
      nome_arquivo TEXT,
      titulo_secao_inspecao TEXT,
      label_local TEXT,
      itens_documentacao JSONB,
      comentarios_documentacao TEXT,
      locais JSONB,
      distribuicao_eletrica JSONB,
      observacoes_gerais TEXT,
      conclusao TEXT,
      conclusao_r01 TEXT,
      conclusao_r02 TEXT,
      assinaturas JSONB,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS data_inspecao DATE`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS titulo_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS subtitulo_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS texto_rodape_capa TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS titulo_inspecao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS descricao_inspecao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS titulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS subtitulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS cliente TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS revisao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS eng_responsavel TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS nome_arquivo TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS titulo_secao_inspecao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS label_local TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS itens_documentacao JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS comentarios_documentacao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS locais JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS distribuicao_eletrica JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS conclusao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS conclusao_r01 TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS conclusao_r02 TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS assinaturas JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`ALTER TABLE public.inspecoes_eletrica ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'inspecoes_eletrica_id_empreendimento_fkey'
      ) THEN
        ALTER TABLE public.inspecoes_eletrica
        ADD CONSTRAINT inspecoes_eletrica_id_empreendimento_fkey
        FOREIGN KEY (id_empreendimento) REFERENCES public.empreendimentos(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);
  await p.query('DROP TRIGGER IF EXISTS inspecoes_eletrica_set_updated_at ON public.inspecoes_eletrica');
  await p.query('CREATE TRIGGER inspecoes_eletrica_set_updated_at BEFORE UPDATE ON public.inspecoes_eletrica FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_eletrica_empreendimento ON public.inspecoes_eletrica (id_empreendimento)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_eletrica_data ON public.inspecoes_eletrica (data_inspecao)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_eletrica_revisao ON public.inspecoes_eletrica (revisao)');

  inspecaoEletricaSchemaEnsured = true;
}

function mapInspecaoEletricaRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: formatDateForAPI(row.data_inspecao),
    titulo_capa: row.titulo_capa,
    subtitulo_capa: row.subtitulo_capa,
    texto_rodape_capa: row.texto_rodape_capa,
    titulo_inspecao: row.titulo_inspecao,
    descricao_inspecao: row.descricao_inspecao,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    titulo_secao_inspecao: row.titulo_secao_inspecao,
    label_local: row.label_local,
    itens_documentacao: row.itens_documentacao,
    comentarios_documentacao: row.comentarios_documentacao,
    locais: row.locais,
    distribuicao_eletrica: row.distribuicao_eletrica,
    observacoes_gerais: row.observacoes_gerais,
    conclusao: row.conclusao,
    conclusao_r01: row.conclusao_r01,
    conclusao_r02: row.conclusao_r02,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapLegacyInspecaoEletricaRow(row) {
  const ele = row.inspecao_eletrica && typeof row.inspecao_eletrica === 'object' ? row.inspecao_eletrica : {};
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: formatDateForAPI(row.data_inspecao),
    titulo_capa: ele.titulo_capa ?? null,
    subtitulo_capa: ele.subtitulo_capa ?? null,
    texto_rodape_capa: ele.texto_rodape_capa ?? null,
    titulo_inspecao: ele.titulo_inspecao ?? null,
    descricao_inspecao: ele.descricao_inspecao ?? null,
    titulo_relatorio: row.titulo_relatorio ?? ele.titulo_relatorio ?? null,
    subtitulo_relatorio: row.subtitulo_relatorio ?? ele.subtitulo_relatorio ?? null,
    cliente: row.cliente ?? ele.cliente ?? null,
    revisao: row.revisao ?? ele.revisao ?? null,
    eng_responsavel: row.eng_responsavel ?? ele.eng_responsavel ?? null,
    nome_arquivo: row.nome_arquivo ?? ele.nome_arquivo ?? null,
    titulo_secao_inspecao: row.titulo_secao_inspecao ?? ele.titulo_secao_inspecao ?? null,
    label_local: ele.label_local ?? null,
    itens_documentacao: row.itens_documentacao ?? ele.itens_documentacao ?? [],
    comentarios_documentacao: row.comentarios_documentacao ?? ele.comentarios_documentacao ?? null,
    locais: row.locais ?? ele.locais ?? [],
    distribuicao_eletrica: ele.distribuicao_eletrica ?? [],
    observacoes_gerais: row.observacoes_gerais ?? ele.observacoes_gerais ?? null,
    conclusao: ele.conclusao ?? row.conclusao ?? row.conclusao_r02 ?? row.conclusao_r01 ?? null,
    conclusao_r01: ele.conclusao_r01 ?? row.conclusao_r01 ?? null,
    conclusao_r02: ele.conclusao_r02 ?? row.conclusao_r02 ?? null,
    assinaturas: row.assinaturas ?? ele.assinaturas ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    legacy_source: 'inspecoes_ar_condicionado',
  };
}

function isLikelyLegacyInspecaoEletrica(row) {
  if (!row) return false;
  const ele = row.inspecao_eletrica;
  if (ele && typeof ele === 'object' && !Array.isArray(ele) && Object.keys(ele).length > 0) return true;
  const titulo = String(row.titulo_relatorio || '').toLowerCase();
  const secao = String(row.titulo_secao_inspecao || '').toLowerCase();
  const arquivo = String(row.nome_arquivo || '').toLowerCase();
  return titulo.includes('elétrica') || titulo.includes('eletrica') || secao.includes('quadro') || arquivo.startsWith('iele');
}

function sortInspecoesEletrica(rows, order) {
  const orderValue = typeof order === 'string' && order.trim() ? order.trim() : '-data_inspecao';
  const desc = orderValue.startsWith('-');
  const field = desc ? orderValue.slice(1) : orderValue;
  const direction = desc ? -1 : 1;

  return [...rows].sort((left, right) => {
    const a = left?.[field] ?? left?.created_at ?? null;
    const b = right?.[field] ?? right?.created_at ?? null;
    if (a === b) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    const aTime = Date.parse(a);
    const bTime = Date.parse(b);
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
      return (aTime - bTime) * direction;
    }

    return String(a).localeCompare(String(b), 'pt-BR', { numeric: true }) * direction;
  });
}

app.get('/api/inspecoes-eletrica', async (req, res) => {
  try {
    await ensureInspecaoEletricaSchema();
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_eletrica ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);

    const legacySql = `SELECT * FROM public.inspecoes_ar_condicionado ${whereClause} ${orderClause}`;
    const { rows: legacyRows } = await p.query(legacySql, params);

    const merged = [
      ...rows.map(mapInspecaoEletricaRow),
      ...legacyRows.filter(isLikelyLegacyInspecaoEletrica).map(mapLegacyInspecaoEletricaRow),
    ];

    res.json(sortInspecoesEletrica(merged, typeof order === 'string' ? order : undefined));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-eletrica/:id', async (req, res) => {
  try {
    await ensureInspecaoEletricaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_eletrica WHERE id = $1', [id]);
    if (rows.length) {
      return res.json(mapInspecaoEletricaRow(rows[0]));
    }

    const { rows: legacyRows } = await p.query('SELECT * FROM public.inspecoes_ar_condicionado WHERE id = $1', [id]);
    if (legacyRows.length && isLikelyLegacyInspecaoEletrica(legacyRows[0])) {
      return res.json(mapLegacyInspecaoEletricaRow(legacyRows[0]));
    }

    return res.status(404).json({ error: 'not_found' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-eletrica', async (req, res) => {
  try {
    await ensureInspecaoEletricaSchema();
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
    const sql = `INSERT INTO public.inspecoes_eletrica (
      id_empreendimento, data_inspecao, titulo_capa, subtitulo_capa, texto_rodape_capa,
      titulo_inspecao, descricao_inspecao, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, titulo_secao_inspecao, label_local,
      itens_documentacao, comentarios_documentacao, locais, distribuicao_eletrica,
      observacoes_gerais, conclusao, conclusao_r01, conclusao_r02, assinaturas
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18::jsonb,$19::jsonb,$20,$21,$22,$23,$24::jsonb
    ) RETURNING *`;
    const params = [
      empId,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      b.titulo_inspecao ?? null,
      b.descricao_inspecao ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      b.titulo_secao_inspecao ?? null,
      b.label_local ?? null,
      toJson(b.itens_documentacao ?? []),
      b.comentarios_documentacao ?? null,
      toJson(b.locais ?? []),
      toJson(b.distribuicao_eletrica ?? []),
      b.observacoes_gerais ?? null,
      b.conclusao ?? null,
      b.conclusao_r01 ?? null,
      b.conclusao_r02 ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoEletricaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-eletrica] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-eletrica/:id', async (req, res) => {
  try {
    await ensureInspecaoEletricaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};

    const { rows: existingRows } = await p.query('SELECT id FROM public.inspecoes_eletrica WHERE id = $1', [id]);
    if (!existingRows.length) {
      const { rows: legacyRows } = await p.query('SELECT * FROM public.inspecoes_ar_condicionado WHERE id = $1', [id]);
      if (!legacyRows.length || !isLikelyLegacyInspecaoEletrica(legacyRows[0])) {
        return res.status(404).json({ error: 'not_found' });
      }

      const currentLegacy = legacyRows[0].inspecao_eletrica && typeof legacyRows[0].inspecao_eletrica === 'object'
        ? legacyRows[0].inspecao_eletrica
        : {};
      const mergedLegacy = {
        ...currentLegacy,
        titulo_capa: b.titulo_capa ?? currentLegacy.titulo_capa ?? null,
        subtitulo_capa: b.subtitulo_capa ?? currentLegacy.subtitulo_capa ?? null,
        texto_rodape_capa: b.texto_rodape_capa ?? currentLegacy.texto_rodape_capa ?? null,
        titulo_inspecao: b.titulo_inspecao ?? currentLegacy.titulo_inspecao ?? null,
        descricao_inspecao: b.descricao_inspecao ?? currentLegacy.descricao_inspecao ?? null,
        label_local: b.label_local ?? currentLegacy.label_local ?? null,
        distribuicao_eletrica: b.distribuicao_eletrica ?? currentLegacy.distribuicao_eletrica ?? [],
        conclusao: b.conclusao ?? currentLegacy.conclusao ?? null,
        conclusao_r01: b.conclusao_r01 ?? currentLegacy.conclusao_r01 ?? null,
        conclusao_r02: b.conclusao_r02 ?? currentLegacy.conclusao_r02 ?? null,
      };

      const legacySql = `UPDATE public.inspecoes_ar_condicionado SET
        id_empreendimento = COALESCE($1, id_empreendimento),
        data_inspecao = $2,
        titulo_secao_inspecao = $3,
        titulo_relatorio = $4,
        subtitulo_relatorio = $5,
        cliente = $6,
        revisao = $7,
        eng_responsavel = $8,
        nome_arquivo = $9,
        itens_documentacao = $10::jsonb,
        comentarios_documentacao = $11,
        locais = $12::jsonb,
        observacoes_gerais = $13,
        inspecao_eletrica = $14::jsonb,
        conclusao_r01 = $15,
        conclusao_r02 = $16,
        assinaturas = $17::jsonb,
        updated_at = now()
      WHERE id = $18 RETURNING *`;
      const legacyParams = [
        (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
        normalizeDate(b.data_inspecao) ?? null,
        b.titulo_secao_inspecao ?? null,
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
        toJson(mergedLegacy),
        b.conclusao_r01 ?? mergedLegacy.conclusao_r01 ?? null,
        b.conclusao_r02 ?? mergedLegacy.conclusao_r02 ?? null,
        toJson(b.assinaturas ?? []),
        id,
      ];
      const { rows: updatedLegacyRows } = await p.query(legacySql, legacyParams);
      return res.json(mapLegacyInspecaoEletricaRow(updatedLegacyRows[0]));
    }

    const sql = `UPDATE public.inspecoes_eletrica SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      titulo_capa = $3,
      subtitulo_capa = $4,
      texto_rodape_capa = $5,
      titulo_inspecao = $6,
      descricao_inspecao = $7,
      titulo_relatorio = $8,
      subtitulo_relatorio = $9,
      cliente = $10,
      revisao = $11,
      eng_responsavel = $12,
      nome_arquivo = $13,
      titulo_secao_inspecao = $14,
      label_local = $15,
      itens_documentacao = $16::jsonb,
      comentarios_documentacao = $17,
      locais = $18::jsonb,
      distribuicao_eletrica = $19::jsonb,
      observacoes_gerais = $20,
      conclusao = $21,
      conclusao_r01 = $22,
      conclusao_r02 = $23,
      assinaturas = $24::jsonb,
      updated_at = now()
    WHERE id = $25 RETURNING *`;
    const params = [
      (b.id_empreendimento !== undefined && b.id_empreendimento !== null) ? Number(b.id_empreendimento) : null,
      normalizeDate(b.data_inspecao) ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      b.titulo_inspecao ?? null,
      b.descricao_inspecao ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_responsavel ?? null,
      b.nome_arquivo ?? null,
      b.titulo_secao_inspecao ?? null,
      b.label_local ?? null,
      toJson(b.itens_documentacao ?? []),
      b.comentarios_documentacao ?? null,
      toJson(b.locais ?? []),
      toJson(b.distribuicao_eletrica ?? []),
      b.observacoes_gerais ?? null,
      b.conclusao ?? null,
      b.conclusao_r01 ?? null,
      b.conclusao_r02 ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoEletricaRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-eletrica/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-eletrica/:id', async (req, res) => {
  try {
    await ensureInspecaoEletricaSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_eletrica WHERE id = $1', [id]);
    if (rowCount) {
      return res.json({ ok: true });
    }

    const { rows: legacyRows } = await p.query('SELECT * FROM public.inspecoes_ar_condicionado WHERE id = $1', [id]);
    if (!legacyRows.length || !isLikelyLegacyInspecaoEletrica(legacyRows[0])) return res.status(404).json({ error: 'not_found' });

    await p.query('DELETE FROM public.inspecoes_ar_condicionado WHERE id = $1', [id]);
    return res.json({ ok: true });
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
    data_inspecao: formatDateForAPI(row.data_inspecao),
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
    data_inspecao: formatDateForAPI(row.data_inspecao),
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
    data_inspecao: formatDateForAPI(row.data_inspecao),
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

// ===== Inspeções de Vistoria de Obra Padrão =====
let inspecaoVistoriaObraPadraoSchemaEnsured = false;
async function ensureInspecaoVistoriaObraPadraoSchema() {
  if (inspecaoVistoriaObraPadraoSchemaEnsured) return;
  const p = requirePool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.inspecoes_vistoria_obra_padrao (
      id BIGSERIAL PRIMARY KEY,
      id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
      data_inspecao DATE,
      titulo_relatorio TEXT,
      subtitulo_relatorio TEXT,
      cliente TEXT,
      revisao TEXT,
      eng_responsavel TEXT,
      nome_arquivo TEXT,
      itens_documentacao JSONB,
      secoes JSONB,
      observacoes_gerais TEXT,
      assinaturas JSONB,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS data_inspecao DATE`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS titulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS subtitulo_relatorio TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS cliente TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS revisao TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS eng_responsavel TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS nome_arquivo TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS itens_documentacao JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS secoes JSONB`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT`);
  await p.query(`ALTER TABLE public.inspecoes_vistoria_obra_padrao ADD COLUMN IF NOT EXISTS assinaturas JSONB`);
  await p.query('DROP TRIGGER IF EXISTS inspecoes_vistoria_obra_padrao_set_updated_at ON public.inspecoes_vistoria_obra_padrao');
  await p.query('CREATE TRIGGER inspecoes_vistoria_obra_padrao_set_updated_at BEFORE UPDATE ON public.inspecoes_vistoria_obra_padrao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_vistoria_obra_padrao_empreendimento ON public.inspecoes_vistoria_obra_padrao (id_empreendimento)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_inspecoes_vistoria_obra_padrao_data ON public.inspecoes_vistoria_obra_padrao (data_inspecao)');
  inspecaoVistoriaObraPadraoSchemaEnsured = true;
}

function mapInspecaoVistoriaObraPadraoRow(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_inspecao: formatDateForAPI(row.data_inspecao),
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_responsavel: row.eng_responsavel,
    nome_arquivo: row.nome_arquivo,
    itens_documentacao: row.itens_documentacao,
    secoes: row.secoes,
    observacoes_gerais: row.observacoes_gerais,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/inspecoes-vistoria-obra-padrao', async (req, res) => {
  try {
    await ensureInspecaoVistoriaObraPadraoSchema();
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.inspecoes_vistoria_obra_padrao ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
    res.json(rows.map(mapInspecaoVistoriaObraPadraoRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/inspecoes-vistoria-obra-padrao/:id', async (req, res) => {
  try {
    await ensureInspecaoVistoriaObraPadraoSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.inspecoes_vistoria_obra_padrao WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoVistoriaObraPadraoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/inspecoes-vistoria-obra-padrao', async (req, res) => {
  try {
    await ensureInspecaoVistoriaObraPadraoSchema();
    const p = requirePool();
    const b = req.body || {};
    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'missing_id_empreendimento' });
    }
    console.log('[POST /api/inspecoes-vistoria-obra-padrao] body:', JSON.stringify(b).slice(0, 2000));
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
    const sql = `INSERT INTO public.inspecoes_vistoria_obra_padrao (
      id_empreendimento, data_inspecao, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_responsavel, nome_arquivo, itens_documentacao, secoes,
      observacoes_gerais, assinaturas
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
      toJson(b.secoes ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? [])
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapInspecaoVistoriaObraPadraoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    const detail = err && typeof err === 'object' && 'detail' in err ? err.detail : undefined;
    console.error('[POST /api/inspecoes-vistoria-obra-padrao] error:', err);
    res.status(500).json({ error: msg, code, detail });
  }
});

app.put('/api/inspecoes-vistoria-obra-padrao/:id', async (req, res) => {
  try {
    await ensureInspecaoVistoriaObraPadraoSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.inspecoes_vistoria_obra_padrao SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      data_inspecao = $2,
      titulo_relatorio = $3,
      subtitulo_relatorio = $4,
      cliente = $5,
      revisao = $6,
      eng_responsavel = $7,
      nome_arquivo = $8,
      itens_documentacao = $9::jsonb,
      secoes = $10::jsonb,
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
      toJson(b.secoes ?? []),
      b.observacoes_gerais ?? null,
      toJson(b.assinaturas ?? []),
      id
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapInspecaoVistoriaObraPadraoRow(rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    console.error('[PUT /api/inspecoes-vistoria-obra-padrao/:id] error:', err);
    res.status(500).json({ error: msg, code });
  }
});

app.delete('/api/inspecoes-vistoria-obra-padrao/:id', async (req, res) => {
  try {
    await ensureInspecaoVistoriaObraPadraoSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.inspecoes_vistoria_obra_padrao WHERE id = $1', [id]);
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
      b.id_empreendimento ?? null,
      b.numero_relatorio ?? null,
      b.nome_arquivo ?? null,
      normalizeDate(b.data_inicio_semana) ?? null,
      normalizeDate(b.data_fim_semana) ?? null,
      b.fisico_real_total ?? null,
      b.efetivo ?? null,
      b.avanco_fisico_acumulado ?? null,
      b.avanco_financeiro_acumulado ?? null,
      b.principais_atividades_semana ?? null,
      b.atividades_proxima_semana_tabela ?? null,
      b.caminho_critico ?? null,
      b.impedimentos ?? null,
      b.fotos ?? null,
      b.vistos ?? null,
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
    data_reuniao: formatDateForAPI(row.data_reuniao),
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
    const { rows } = await p.query(`SELECT * FROM public.kos_unidade ${whereClause} ${orderClause} `, params);
    res.json(rows.map(mapKO));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) return res.json([]);
    try {
      console.error('[/api/formularios-vistoria] SQL:', sql);
      console.error('[/api/formularios-vistoria] params:', params);
      console.error('[/api/formularios-vistoria] error:', err && err.stack ? err.stack : String(err));
    } catch (logErr) {
      console.error('Error while logging formularios-vistoria failure', logErr);
    }
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
    const sql = `INSERT INTO public.kos_unidade(
      id_unidade, item_ko, descricao_ok, comentario_ko, replica_ko, treplica_ko,
      imagem_ko, comentario_im_ko, disciplina_ko, status, data_inclusao_ko, emissao_ko
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING * `;
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
    WHERE id = $13 RETURNING * `;
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
    const { rows } = await p.query(`SELECT * FROM public.vos_unidade ${whereClause} ${orderClause} `, params);
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
    const { rows } = await p.query(`SELECT * FROM public.aps_unidade ${whereClause} ${orderClause} `, params);
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
    const sql = `INSERT INTO public.aps_unidade(
      id_unidade, id_anterior, item_ap, descricao_ap, comentario_ap, replica_ap, treplica_ap,
      imagem_ap, comentario_im_ap, disciplina_ap, status, data_inclusao_ap, emissao_ap
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING * `;
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
    WHERE id = $14 RETURNING * `;
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
    const sql = `INSERT INTO public.vos_unidade(
      id_unidade, item_vo, descricao_vo, comentario_vo, replica_vo, treplica_vo,
      imagem_vo, comentario_im_vo, disciplina_vo, status, data_inclusao_vo, emissao_vo
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING * `;
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
    WHERE id = $13 RETURNING * `;
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
    const { rows } = await p.query(`SELECT * FROM public.diarios_obra ${whereClause} ${orderClause} `, params);
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
    const sql = `INSERT INTO public.diarios_obra(
      id_empreendimento, id_unidade, unidade_texto, nome_arquivo, numero_diario, data_diario,
      condicao_climatica, horas_paralisadas, periodo_trabalhado, efetivo, principais_atividades,
      ocorrencias_observacoes, fotos, vistos
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING * `;
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
    WHERE id = $15 RETURNING * `;
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
    console.log('[DELETE /api/diarios-obra] incoming id=', id, 'auth_present=', !!req.headers.authorization);
    const { rowCount } = await p.query('DELETE FROM public.diarios_obra WHERE id = $1', [id]);
    console.log('[DELETE /api/diarios-obra] db rowCount=', rowCount, 'id=', id);
    if (!rowCount) {
      console.log('[DELETE /api/diarios-obra] not found in DB id=', id, '— checking other tables and memory fallback');
      // If the ID exists in another table (common deploy mismatch), return a helpful message
      try {
        const other = await p.query('SELECT id FROM public.lista_documentos_report WHERE id = $1', [id]);
        if (other && other.rowCount) {
          console.log('[DELETE /api/diarios-obra] id found in lista_documentos_report id=', id, '— performing delete there to recover');
          try {
            const del = await p.query('DELETE FROM public.lista_documentos_report WHERE id = $1', [id]);
            if (del && del.rowCount) {
              console.log('[DELETE /api/diarios-obra] deleted id from lista_documentos_report id=', id);
              return res.json({ ok: true, deletedFrom: 'lista_documentos_report', note: 'deleted because frontend called /diarios-obra but resource lived in lista_documentos_report' });
            }
          } catch (delErr) {
            console.log('[DELETE /api/diarios-obra] error deleting from lista_documentos_report:', delErr && delErr.message ? delErr.message : String(delErr));
            // fall through to memory fallback / 404 below
          }
        }
      } catch (chkErr) {
        // ignore check errors and continue to memory fallback
        console.log('[DELETE /api/diarios-obra] error checking lista_documentos_report:', chkErr && chkErr.message ? chkErr.message : String(chkErr));
      }

      // Try to remove from in-memory store if present (fallback for dev)
      const idx = (memory.diarios_obra || []).findIndex(d => Number(d.id) === id);
      if (idx !== -1) {
        memory.diarios_obra.splice(idx, 1);
        console.log('[DELETE /api/diarios-obra] removed from memory id=', id);
        return res.json({ ok: true, fallback: 'memory' });
      }
      return res.status(404).json({ error: 'not_found' });
    }
    console.log('[DELETE /api/diarios-obra] deleted id=', id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/diarios-obra] error during delete:', err && err.message ? err.message : String(err));
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    console.log('[DELETE /api/diarios-obra] falling back to in-memory deletion due to DB error');
    const id = Number(req.params.id);
    const idx = (memory.diarios_obra || []).findIndex(d => d.id === id);
    console.log('[DELETE /api/diarios-obra] in-memory idx=', idx, 'id=', id);
    if (idx === -1) {
      console.log('[DELETE /api/diarios-obra] not found in memory id=', id);
      return res.status(404).json({ error: 'not_found' });
    }
    memory.diarios_obra.splice(idx, 1);
    res.json({ ok: true });
  }
});

// ---- RDO (Relatório Diário de Obra) ----
function mapRDO(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    tipo_documento: row.tipo_documento,
    numero_relatorio: row.numero_relatorio,
    data_relatorio: dateOnlyForInput(row.data_relatorio),
    dia_semana: row.dia_semana,
    obra_nome: row.obra_nome,
    obra_local: row.obra_local,
    contratada: row.contratada,
    responsavel: row.responsavel,
    contrato: row.contrato,
    prazo_contratual: row.prazo_contratual,
    prazo_decorrido: row.prazo_decorrido,
    prazo_vencer: row.prazo_vencer,
    condicao_climatica: row.condicao_climatica,
    equipes_campo: row.equipes_campo,
    atividades_realizadas: row.atividades_realizadas,
    ocorrencias: row.ocorrencias,
    documentos: row.documentos,
    fotos: row.fotos,
    assinaturas: row.assinaturas,
    observacoes: row.observacoes,
    status_documento: row.status_documento,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/rdos', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.rdos ${whereClause} ${orderClause} `, params);
    res.json(rows.map(mapRDO));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.json([]);
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/rdos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.rdos WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRDO(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/rdos', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.rdos(
      id_empreendimento, tipo_documento, numero_relatorio, data_relatorio, dia_semana,
      obra_nome, obra_local, contratada, responsavel, contrato,
      prazo_contratual, prazo_decorrido, prazo_vencer,
      condicao_climatica, equipes_campo, atividades_realizadas, ocorrencias,
      documentos, fotos, assinaturas, observacoes, status_documento
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    ) RETURNING * `;
    const params = [
      b.id_empreendimento,
      b.tipo_documento ?? null,
      b.numero_relatorio ?? null,
      normalizeDate(b.data_relatorio) ?? null,
      b.dia_semana ?? null,
      b.obra_nome ?? null,
      b.obra_local ?? null,
      b.contratada ?? null,
      b.responsavel ?? null,
      b.contrato ?? null,
      b.prazo_contratual ?? null,
      b.prazo_decorrido ?? null,
      b.prazo_vencer ?? null,
      toJson(b.condicao_climatica),
      toJson(b.equipes_campo),
      toJson(b.atividades_realizadas),
      toJson(b.ocorrencias),
      toJson(b.documentos),
      toJson(b.fotos),
      toJson(b.assinaturas),
      b.observacoes ?? null,
      b.status_documento ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapRDO(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(500).json({ error: 'database_unavailable' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/rdos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.rdos SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      tipo_documento = COALESCE($2, tipo_documento),
      numero_relatorio = COALESCE($3, numero_relatorio),
      data_relatorio = COALESCE($4, data_relatorio),
      dia_semana = COALESCE($5, dia_semana),
      obra_nome = COALESCE($6, obra_nome),
      obra_local = COALESCE($7, obra_local),
      contratada = COALESCE($8, contratada),
      responsavel = COALESCE($9, responsavel),
      contrato = COALESCE($10, contrato),
      prazo_contratual = COALESCE($11, prazo_contratual),
      prazo_decorrido = COALESCE($12, prazo_decorrido),
      prazo_vencer = COALESCE($13, prazo_vencer),
      condicao_climatica = COALESCE($14, condicao_climatica),
      equipes_campo = COALESCE($15, equipes_campo),
      atividades_realizadas = COALESCE($16, atividades_realizadas),
      ocorrencias = COALESCE($17, ocorrencias),
      documentos = COALESCE($18, documentos),
      fotos = COALESCE($19, fotos),
      assinaturas = COALESCE($20, assinaturas),
      observacoes = COALESCE($21, observacoes),
      status_documento = COALESCE($22, status_documento)
    WHERE id = $23 RETURNING * `;
    const params = [
      b.id_empreendimento ?? null,
      b.tipo_documento ?? null,
      b.numero_relatorio ?? null,
      normalizeDate(b.data_relatorio) ?? null,
      b.dia_semana ?? null,
      b.obra_nome ?? null,
      b.obra_local ?? null,
      b.contratada ?? null,
      b.responsavel ?? null,
      b.contrato ?? null,
      b.prazo_contratual ?? null,
      b.prazo_decorrido ?? null,
      b.prazo_vencer ?? null,
      toJson(b.condicao_climatica),
      toJson(b.equipes_campo),
      toJson(b.atividades_realizadas),
      toJson(b.ocorrencias),
      toJson(b.documentos),
      toJson(b.fotos),
      toJson(b.assinaturas),
      b.observacoes ?? null,
      b.status_documento ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRDO(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/rdos/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.rdos WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Lista de Documentos Report ----
function mapListaDocumentosReport(row) {
  // Converte URLs relativas em absolutas para documentos/fotos
  let documentos = row.documentos;
  if (documentos && Array.isArray(documentos)) {
    const baseUrl = getServerBaseUrl();
    documentos = documentos.map(doc => {
      // Se o documento tem fotos, converter URLs
      if (doc.fotos && Array.isArray(doc.fotos)) {
        doc = {
          ...doc,
          fotos: doc.fotos.map(foto => {
            if (foto.url && foto.url.startsWith('/api/')) {
              return { ...foto, url: `${baseUrl}${foto.url}` };
            }
            return foto;
          })
        };
      }
      return doc;
    });
  }

  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    cliente: row.cliente,
    empreendimento: row.empreendimento,
    titulo: row.titulo,
    numero_documento: row.numero_documento,
    revisao: row.revisao,
    data_aviso: row.data_aviso,
    documentos: documentos,
    assinaturas: row.assinaturas,
    observacoes_gerais: row.observacoes_gerais,
    status_documento: row.status_documento,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/lista-documentos-report', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.lista_documentos_report ${whereClause} ${orderClause} `, params);
    res.json(rows.map(mapListaDocumentosReport));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.json([]);
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/lista-documentos-report/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.lista_documentos_report WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapListaDocumentosReport(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/lista-documentos-report', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.lista_documentos_report(
      id_empreendimento, cliente, empreendimento, titulo, numero_documento, revisao, data_aviso,
      documentos, assinaturas, observacoes_gerais, status_documento
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING * `;
    const params = [
      b.id_empreendimento,
      b.cliente ?? null,
      b.empreendimento ?? null,
      b.titulo ?? null,
      b.numero_documento ?? null,
      b.revisao ?? null,
      normalizeDate(b.data_aviso) ?? null,
      toJson(b.documentos),
      toJson(b.assinaturas),
      b.observacoes_gerais ?? null,
      b.status_documento ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapListaDocumentosReport(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(500).json({ error: 'database_unavailable' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/lista-documentos-report/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.lista_documentos_report SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      cliente = COALESCE($2, cliente),
      empreendimento = COALESCE($3, empreendimento),
      titulo = COALESCE($4, titulo),
      numero_documento = COALESCE($5, numero_documento),
      revisao = COALESCE($6, revisao),
      data_aviso = COALESCE($7, data_aviso),
      documentos = COALESCE($8, documentos),
      assinaturas = COALESCE($9, assinaturas),
      observacoes_gerais = COALESCE($10, observacoes_gerais),
      status_documento = COALESCE($11, status_documento)
    WHERE id = $12 RETURNING * `;
    const params = [
      b.id_empreendimento ?? null,
      b.cliente ?? null,
      b.empreendimento ?? null,
      b.titulo ?? null,
      b.numero_documento ?? null,
      b.revisao ?? null,
      normalizeDate(b.data_aviso) ?? null,
      toJson(b.documentos),
      toJson(b.assinaturas),
      b.observacoes_gerais ?? null,
      b.status_documento ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapListaDocumentosReport(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/lista-documentos-report/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.lista_documentos_report WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Ata de Reunião (tabela própria: public.atas_reuniao) ----
let ataReuniaoSchemaEnsured = false;

async function ensureAtaReuniaoSchema() {
  if (ataReuniaoSchemaEnsured) return;

  const p = requirePool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.atas_reuniao (
      id BIGSERIAL PRIMARY KEY,
      id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
      titulo_reuniao TEXT,
      subtitulo_reuniao TEXT,
      data_reuniao DATE,
      hora_inicio TEXT,
      hora_termino TEXT,
      local_reuniao TEXT,
      tipo_reuniao TEXT,
      edificio TEXT,
      nome_arquivo TEXT,
      locatario TEXT,
      titulo_capa TEXT,
      subtitulo_capa TEXT,
      texto_rodape_capa TEXT,
      participantes JSONB,
      informacoes_obra JSONB,
      itens_discutidos JSONB,
      observacoes TEXT,
      arquivo_ata TEXT,
      responsavel_reuniao TEXT,
      assinaturas JSONB,
      status TEXT,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);

  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS titulo_reuniao TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS subtitulo_reuniao TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS data_reuniao DATE`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS hora_inicio TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS hora_termino TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS local_reuniao TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS tipo_reuniao TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS edificio TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS nome_arquivo TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS locatario TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS titulo_capa TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS subtitulo_capa TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS texto_rodape_capa TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS participantes JSONB`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS informacoes_obra JSONB`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS itens_discutidos JSONB`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS observacoes TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS arquivo_ata TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS responsavel_reuniao TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS assinaturas JSONB`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS status TEXT`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`ALTER TABLE public.atas_reuniao ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL`);

  await p.query('DROP TRIGGER IF EXISTS atas_reuniao_set_updated_at ON public.atas_reuniao');
  await p.query('CREATE TRIGGER atas_reuniao_set_updated_at BEFORE UPDATE ON public.atas_reuniao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');
  await p.query('CREATE INDEX IF NOT EXISTS idx_atas_reuniao_empreendimento ON public.atas_reuniao (id_empreendimento)');
  await p.query('CREATE INDEX IF NOT EXISTS idx_atas_reuniao_data ON public.atas_reuniao (data_reuniao)');

  ataReuniaoSchemaEnsured = true;
}

function mapAtaReuniao(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    titulo_reuniao: row.titulo_reuniao,
    subtitulo_reuniao: row.subtitulo_reuniao,
    data_reuniao: formatDateForAPI(row.data_reuniao),
    hora_inicio: row.hora_inicio || null,
    hora_termino: row.hora_termino || null,
    local_reuniao: row.local_reuniao || null,
    tipo_reuniao: row.tipo_reuniao || null,
    observacoes: row.observacoes || null,
    arquivo_ata: row.arquivo_ata || null,
    responsavel_reuniao: row.responsavel_reuniao || null,
    status: row.status || null,
    participantes: row.participantes || [],
    informacoes_obra: row.informacoes_obra || [],
    itens_discutidos: row.itens_discutidos || [],
    assinaturas: row.assinaturas || [],
    nome_arquivo: row.nome_arquivo || null,
    texto_rodape_capa: row.texto_rodape_capa || null,
    edificio: row.edificio || null,
    locatario: row.locatario || null,
    titulo_capa: row.titulo_capa || null,
    subtitulo_capa: row.subtitulo_capa || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/ata-reuniao', async (req, res) => {
  try {
    await ensureAtaReuniaoSchema();
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) { where.push('id_empreendimento = $' + (params.length + 1)); params.push(Number(id_empreendimento)); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.atas_reuniao ${whereClause} ${orderClause} `, params);
    res.json(rows.map(mapAtaReuniao));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.json([]);
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/ata-reuniao/:id', async (req, res) => {
  try {
    await ensureAtaReuniaoSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.atas_reuniao WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapAtaReuniao(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/ata-reuniao', async (req, res) => {
  try {
    await ensureAtaReuniaoSchema();
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.atas_reuniao(
      id_empreendimento, titulo_reuniao, subtitulo_reuniao, data_reuniao,
      hora_inicio, hora_termino, local_reuniao, tipo_reuniao,
      edificio, nome_arquivo, locatario, titulo_capa, subtitulo_capa, texto_rodape_capa,
      participantes, informacoes_obra, itens_discutidos, observacoes,
      arquivo_ata, responsavel_reuniao, assinaturas, status
    ) VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
    ) RETURNING * `;
    const params = [
      b.id_empreendimento ?? null,
      b.titulo_reuniao ?? null,
      b.subtitulo_reuniao ?? null,
      normalizeDate(b.data_reuniao) ?? null,
      b.hora_inicio ?? null,
      b.hora_termino ?? null,
      b.local_reuniao ?? null,
      b.tipo_reuniao ?? null,
      b.edificio ?? null,
      b.nome_arquivo ?? null,
      b.locatario ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      toJson(b.participantes),
      toJson(b.informacoes_obra),
      toJson(b.itens_discutidos),
      b.observacoes ?? null,
      b.arquivo_ata ?? null,
      b.responsavel_reuniao ?? null,
      toJson(b.assinaturas),
      b.status ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapAtaReuniao(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(500).json({ error: 'database_unavailable' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/ata-reuniao/:id', async (req, res) => {
  try {
    await ensureAtaReuniaoSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.atas_reuniao SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      titulo_reuniao = COALESCE($2, titulo_reuniao),
      subtitulo_reuniao = COALESCE($3, subtitulo_reuniao),
      data_reuniao = COALESCE($4, data_reuniao),
      hora_inicio = COALESCE($5, hora_inicio),
      hora_termino = COALESCE($6, hora_termino),
      local_reuniao = COALESCE($7, local_reuniao),
      tipo_reuniao = COALESCE($8, tipo_reuniao),
      edificio = COALESCE($9, edificio),
      nome_arquivo = COALESCE($10, nome_arquivo),
      locatario = COALESCE($11, locatario),
      titulo_capa = COALESCE($12, titulo_capa),
      subtitulo_capa = COALESCE($13, subtitulo_capa),
      texto_rodape_capa = COALESCE($14, texto_rodape_capa),
      participantes = COALESCE($15, participantes),
      informacoes_obra = COALESCE($16, informacoes_obra),
      itens_discutidos = COALESCE($17, itens_discutidos),
      observacoes = COALESCE($18, observacoes),
      arquivo_ata = COALESCE($19, arquivo_ata),
      responsavel_reuniao = COALESCE($20, responsavel_reuniao),
      assinaturas = COALESCE($21, assinaturas),
      status = COALESCE($22, status)
    WHERE id = $23 RETURNING * `;
    const params = [
      b.id_empreendimento ?? null,
      b.titulo_reuniao ?? null,
      b.subtitulo_reuniao ?? null,
      normalizeDate(b.data_reuniao) ?? null,
      b.hora_inicio ?? null,
      b.hora_termino ?? null,
      b.local_reuniao ?? null,
      b.tipo_reuniao ?? null,
      b.edificio ?? null,
      b.nome_arquivo ?? null,
      b.locatario ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      toJson(b.participantes),
      toJson(b.informacoes_obra),
      toJson(b.itens_discutidos),
      b.observacoes ?? null,
      b.arquivo_ata ?? null,
      b.responsavel_reuniao ?? null,
      toJson(b.assinaturas),
      b.status ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapAtaReuniao(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/ata-reuniao/:id', async (req, res) => {
  try {
    await ensureAtaReuniaoSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.atas_reuniao WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Vistorias Terminalidade ----
function mapTerminalidade(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_vistoria: formatDateForAPI(row.data_vistoria),
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
    const { rows } = await p.query(`SELECT * FROM public.vistorias_terminalidade ${whereClause} ${orderClause} `, params);
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
    const sql = `INSERT INTO public.vistorias_terminalidade(
      id_empreendimento, data_vistoria, titulo_relatorio, subtitulo_relatorio,
      cliente, revisao, eng_obra, secoes, assinaturas
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) RETURNING * `;
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
    WHERE id = $10 RETURNING * `;
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

// ---- Não Conformidades ----
function mapNaoConformidade(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    data_vistoria: formatDateForAPI(row.data_vistoria),
    titulo_capa: row.titulo_capa,
    subtitulo_capa: row.subtitulo_capa,
    texto_rodape_capa: row.texto_rodape_capa,
    titulo_relatorio: row.titulo_relatorio,
    subtitulo_relatorio: row.subtitulo_relatorio,
    cliente: row.cliente,
    revisao: row.revisao,
    eng_obra: row.eng_obra,
    nome_arquivo: row.nome_arquivo,
    secoes: row.secoes,
    assinaturas: row.assinaturas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/nao-conformidades', async (req, res) => {
  try {
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) {
      where.push('id_empreendimento = $' + (params.length + 1));
      params.push(Number(id_empreendimento));
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.nao_conformidades ${whereClause} ${orderClause} `, params);
    res.json(rows.map(mapNaoConformidade));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const { id_empreendimento } = req.query;
    let data = memory.nao_conformidades;
    if (id_empreendimento) data = data.filter(v => Number(v.id_empreendimento) === Number(id_empreendimento));
    res.json(data);
  }
});

app.get('/api/nao-conformidades/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.nao_conformidades WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapNaoConformidade(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/nao-conformidades', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.nao_conformidades(
      id_empreendimento, data_vistoria, titulo_capa, subtitulo_capa,
      texto_rodape_capa, titulo_relatorio, subtitulo_relatorio, cliente,
      revisao, eng_obra, nome_arquivo, secoes, assinaturas
    ) VALUES(
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12, $13
    ) RETURNING * `;
    const params = [
      b.id_empreendimento,
      normalizeDate(b.data_vistoria) ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_obra ?? null,
      b.nome_arquivo ?? null,
      toJson(b.secoes),
      toJson(b.assinaturas),
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapNaoConformidade(rows[0]));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const b = req.body || {};
    const id = ++memoryIdSeq;
    const payload = {
      id,
      id_empreendimento: Number(b.id_empreendimento),
      data_vistoria: normalizeDate(b.data_vistoria) ?? null,
      titulo_capa: b.titulo_capa ?? null,
      subtitulo_capa: b.subtitulo_capa ?? null,
      texto_rodape_capa: b.texto_rodape_capa ?? null,
      titulo_relatorio: b.titulo_relatorio ?? null,
      subtitulo_relatorio: b.subtitulo_relatorio ?? null,
      cliente: b.cliente ?? null,
      revisao: b.revisao ?? null,
      eng_obra: b.eng_obra ?? null,
      nome_arquivo: b.nome_arquivo ?? null,
      secoes: b.secoes ?? null,
      assinaturas: b.assinaturas ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memory.nao_conformidades.push(payload);
    res.status(201).json(payload);
  }
});

app.put('/api/nao-conformidades/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.nao_conformidades SET
    id_empreendimento = COALESCE($1, id_empreendimento),
    data_vistoria = COALESCE($2, data_vistoria),
    titulo_capa = COALESCE($3, titulo_capa),
    subtitulo_capa = COALESCE($4, subtitulo_capa),
    texto_rodape_capa = COALESCE($5, texto_rodape_capa),
    titulo_relatorio = COALESCE($6, titulo_relatorio),
    subtitulo_relatorio = COALESCE($7, subtitulo_relatorio),
    cliente = COALESCE($8, cliente),
    revisao = COALESCE($9, revisao),
    eng_obra = COALESCE($10, eng_obra),
    nome_arquivo = COALESCE($11, nome_arquivo),
    secoes = COALESCE($12, secoes),
    assinaturas = COALESCE($13, assinaturas)
    WHERE id = $14 RETURNING * `;
    const params = [
      b.id_empreendimento ?? null,
      normalizeDate(b.data_vistoria) ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      b.titulo_relatorio ?? null,
      b.subtitulo_relatorio ?? null,
      b.cliente ?? null,
      b.revisao ?? null,
      b.eng_obra ?? null,
      b.nome_arquivo ?? null,
      toJson(b.secoes),
      toJson(b.assinaturas),
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapNaoConformidade(rows[0]));
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const id = Number(req.params.id);
    const b = req.body || {};
    const x = memory.nao_conformidades.find(v => v.id === id);
    if (!x) return res.status(404).json({ error: 'not_found' });
    x.id_empreendimento = b.id_empreendimento ?? x.id_empreendimento;
    x.data_vistoria = normalizeDate(b.data_vistoria) ?? x.data_vistoria;
    x.titulo_capa = b.titulo_capa ?? x.titulo_capa;
    x.subtitulo_capa = b.subtitulo_capa ?? x.subtitulo_capa;
    x.texto_rodape_capa = b.texto_rodape_capa ?? x.texto_rodape_capa;
    x.titulo_relatorio = b.titulo_relatorio ?? x.titulo_relatorio;
    x.subtitulo_relatorio = b.subtitulo_relatorio ?? x.subtitulo_relatorio;
    x.cliente = b.cliente ?? x.cliente;
    x.revisao = b.revisao ?? x.revisao;
    x.eng_obra = b.eng_obra ?? x.eng_obra;
    x.nome_arquivo = b.nome_arquivo ?? x.nome_arquivo;
    x.secoes = b.secoes ?? x.secoes;
    x.assinaturas = b.assinaturas ?? x.assinaturas;
    x.updated_at = new Date().toISOString();
    res.json(x);
  }
});

app.delete('/api/nao-conformidades/:id', async (req, res) => {
  try {
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.nao_conformidades WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    if (!shouldReturnEmptyOnDbError(err)) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      return;
    }
    const id = Number(req.params.id);
    const idx = memory.nao_conformidades.findIndex(v => v.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not_found' });
    memory.nao_conformidades.splice(idx, 1);
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
    data_relatorio: formatDateForAPI(row.data_relatorio),
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
    const { rows } = await p.query(`SELECT * FROM public.relatorios_primeiros_servicos ${whereClause} ${orderClause} `);
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
    const sql = `INSERT INTO public.relatorios_primeiros_servicos(
      id_empreendimento, cliente, local, solicitante, obra, disciplina, data_relatorio,
      assunto_relatorio, descricao_relatorio, fotos, status, comentarios_status, aprovacoes
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING * `;
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
    WHERE id = $14 RETURNING * `;
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

// ---- Relatorios Analise Tecnica ----
function mapRAT(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    id_unidade: row.id_unidade,
    numero_os: row.numero_os,
    metragem: row.metragem,
    edificio_pavimento: row.edificio_pavimento,
    nome_arquivo: row.nome_arquivo,
    data_emissao: formatDateForAPI(row.data_emissao),
    fase_emissao: row.fase_emissao,
    revisoes: row.revisoes,
    lista_arquivos: row.lista_arquivos,
    projetos: row.projetos,
    instalacoes_eletricas: row.instalacoes_eletricas,
    instalacoes_hidraulicas: row.instalacoes_hidraulicas,
    projeto_legal_bombeiro: row.projeto_legal_bombeiro,
    instalacoes_hvac: row.instalacoes_hvac,
    conclusao: row.conclusao,
    nota_geral: row.nota_geral,
    titulo_capa: row.titulo_capa,
    subtitulo_capa: row.subtitulo_capa,
    texto_rodape_capa: row.texto_rodape_capa,
    status_relatorio: row.status_relatorio,
    consultor_responsavel: row.consultor_responsavel,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

let ratSchemaEnsured = false;
async function ensureRATSchema() {
  if (ratSchemaEnsured) return;
  const p = requirePool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.relatorios_analise_tecnica (
      id BIGSERIAL PRIMARY KEY,
      id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
      id_unidade BIGINT REFERENCES public.unidades_empreendimento(id) ON DELETE SET NULL,
      numero_os TEXT,
      metragem TEXT,
      edificio_pavimento TEXT,
      nome_arquivo TEXT,
      data_emissao DATE,
      fase_emissao TEXT,
      revisoes JSONB,
      lista_arquivos JSONB,
      projetos JSONB,
      instalacoes_eletricas JSONB,
      instalacoes_hidraulicas JSONB,
      projeto_legal_bombeiro JSONB,
      instalacoes_hvac JSONB,
      conclusao JSONB,
      nota_geral TEXT,
      titulo_capa TEXT,
      subtitulo_capa TEXT,
      texto_rodape_capa TEXT,
      status_relatorio TEXT DEFAULT 'Rascunho',
      consultor_responsavel TEXT,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);

  // Garantia de compatibilidade para ambientes com tabela criada parcialmente.
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS id_unidade BIGINT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS numero_os TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS metragem TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS edificio_pavimento TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS nome_arquivo TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS data_emissao DATE`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS fase_emissao TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS revisoes JSONB`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS lista_arquivos JSONB`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS projetos JSONB`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS instalacoes_eletricas JSONB`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS instalacoes_hidraulicas JSONB`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS projeto_legal_bombeiro JSONB`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS instalacoes_hvac JSONB`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS conclusao JSONB`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS nota_geral TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS titulo_capa TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS subtitulo_capa TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS texto_rodape_capa TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS status_relatorio TEXT DEFAULT 'Rascunho'`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS consultor_responsavel TEXT`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL`);
  await p.query(`ALTER TABLE public.relatorios_analise_tecnica ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL`);

  await p.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'relatorios_analise_tecnica_id_unidade_fkey'
      ) THEN
        ALTER TABLE public.relatorios_analise_tecnica
        ADD CONSTRAINT relatorios_analise_tecnica_id_unidade_fkey
        FOREIGN KEY (id_unidade) REFERENCES public.unidades_empreendimento(id) ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);

  ratSchemaEnsured = true;
}

function buildOrderClauseRAT(order) {
  if (!order) return 'ORDER BY created_at DESC';
  const field = String(order).replace(/^[-+]/, '');
  const dir = String(order).startsWith('-') ? 'DESC' : 'ASC';
  const allowed = new Set(['created_at', 'updated_at', 'data_emissao', 'id']);
  const col = field === 'created_date' ? 'created_at' : field;
  return `ORDER BY ${allowed.has(col) ? col : 'created_at'} ${dir}`;
}

app.get('/api/relatorios-analise-tecnica', async (req, res) => {
  try {
    await ensureRATSchema();
    const p = requirePool();
    const { id_empreendimento, id_unidade, status_relatorio, order } = req.query;
    const where = [];
    const params = [];
    if (id_empreendimento) {
      where.push('id_empreendimento = $' + (params.length + 1));
      params.push(Number(id_empreendimento));
    }
    if (id_unidade) {
      where.push('id_unidade = $' + (params.length + 1));
      params.push(Number(id_unidade));
    }
    if (status_relatorio) {
      where.push('status_relatorio = $' + (params.length + 1));
      params.push(String(status_relatorio));
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClauseRAT(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.relatorios_analise_tecnica ${whereClause} ${orderClause}`, params);
    res.json(rows.map(mapRAT));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/relatorios-analise-tecnica/:id', async (req, res) => {
  try {
    await ensureRATSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.relatorios_analise_tecnica WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRAT(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/relatorios-analise-tecnica', async (req, res) => {
  try {
    await ensureRATSchema();
    const p = requirePool();
    const b = req.body || {};
    const sql = `INSERT INTO public.relatorios_analise_tecnica(
      id_empreendimento, id_unidade, numero_os, metragem, edificio_pavimento, nome_arquivo,
      data_emissao, fase_emissao, revisoes, lista_arquivos, projetos, instalacoes_eletricas,
      instalacoes_hidraulicas, projeto_legal_bombeiro, instalacoes_hvac, conclusao, nota_geral,
      titulo_capa, subtitulo_capa, texto_rodape_capa, status_relatorio, consultor_responsavel
    ) VALUES(
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
      $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17,
      $18, $19, $20, $21, $22
    ) RETURNING *`;
    const params = [
      b.id_empreendimento,
      b.id_unidade ?? null,
      b.numero_os ?? null,
      b.metragem ?? null,
      b.edificio_pavimento ?? null,
      b.nome_arquivo ?? null,
      b.data_emissao ?? null,
      b.fase_emissao ?? null,
      toJson(b.revisoes ?? []),
      toJson(b.lista_arquivos ?? []),
      toJson(b.projetos ?? []),
      toJson(b.instalacoes_eletricas ?? []),
      toJson(b.instalacoes_hidraulicas ?? []),
      toJson(b.projeto_legal_bombeiro ?? []),
      toJson(b.instalacoes_hvac ?? []),
      toJson(b.conclusao ?? []),
      b.nota_geral ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      b.status_relatorio ?? 'Rascunho',
      b.consultor_responsavel ?? null,
    ];
    const { rows } = await p.query(sql, params);
    res.status(201).json(mapRAT(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/relatorios-analise-tecnica/:id', async (req, res) => {
  try {
    await ensureRATSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};
    const sql = `UPDATE public.relatorios_analise_tecnica SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      id_unidade = COALESCE($2, id_unidade),
      numero_os = COALESCE($3, numero_os),
      metragem = COALESCE($4, metragem),
      edificio_pavimento = COALESCE($5, edificio_pavimento),
      nome_arquivo = COALESCE($6, nome_arquivo),
      data_emissao = COALESCE($7, data_emissao),
      fase_emissao = COALESCE($8, fase_emissao),
      revisoes = COALESCE($9::jsonb, revisoes),
      lista_arquivos = COALESCE($10::jsonb, lista_arquivos),
      projetos = COALESCE($11::jsonb, projetos),
      instalacoes_eletricas = COALESCE($12::jsonb, instalacoes_eletricas),
      instalacoes_hidraulicas = COALESCE($13::jsonb, instalacoes_hidraulicas),
      projeto_legal_bombeiro = COALESCE($14::jsonb, projeto_legal_bombeiro),
      instalacoes_hvac = COALESCE($15::jsonb, instalacoes_hvac),
      conclusao = COALESCE($16::jsonb, conclusao),
      nota_geral = COALESCE($17, nota_geral),
      titulo_capa = COALESCE($18, titulo_capa),
      subtitulo_capa = COALESCE($19, subtitulo_capa),
      texto_rodape_capa = COALESCE($20, texto_rodape_capa),
      status_relatorio = COALESCE($21, status_relatorio),
      consultor_responsavel = COALESCE($22, consultor_responsavel)
    WHERE id = $23 RETURNING *`;
    const params = [
      b.id_empreendimento ?? null,
      b.id_unidade ?? null,
      b.numero_os ?? null,
      b.metragem ?? null,
      b.edificio_pavimento ?? null,
      b.nome_arquivo ?? null,
      b.data_emissao ?? null,
      b.fase_emissao ?? null,
      b.revisoes === undefined ? null : toJson(b.revisoes),
      b.lista_arquivos === undefined ? null : toJson(b.lista_arquivos),
      b.projetos === undefined ? null : toJson(b.projetos),
      b.instalacoes_eletricas === undefined ? null : toJson(b.instalacoes_eletricas),
      b.instalacoes_hidraulicas === undefined ? null : toJson(b.instalacoes_hidraulicas),
      b.projeto_legal_bombeiro === undefined ? null : toJson(b.projeto_legal_bombeiro),
      b.instalacoes_hvac === undefined ? null : toJson(b.instalacoes_hvac),
      b.conclusao === undefined ? null : toJson(b.conclusao),
      b.nota_geral ?? null,
      b.titulo_capa ?? null,
      b.subtitulo_capa ?? null,
      b.texto_rodape_capa ?? null,
      b.status_relatorio ?? null,
      b.consultor_responsavel ?? null,
      id,
    ];
    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapRAT(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/relatorios-analise-tecnica/:id', async (req, res) => {
  try {
    await ensureRATSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.relatorios_analise_tecnica WHERE id = $1', [id]);
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
    data_relatorio: formatDateForAPI(row.data_relatorio),
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
    const sql = `SELECT * FROM public.aprovacoes_amostra ${whereClause} ${orderClause} `;
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
    const sql = `INSERT INTO public.aprovacoes_amostra(
      id_empreendimento, cliente, disciplina, local, obra, assunto_amostra, descricao_amostra,
      status, comentarios_status, aprovacoes, fotos, nome_arquivo, data_relatorio
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING * `;
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
    WHERE id = $14 RETURNING * `;
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
function parseJsonSafe(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function mapEmpreendimentoRow(row) {
  const bmContato = parseJsonSafe(row.bm_contato, null);
  const mantenedorContato = parseJsonSafe(row.mantenedor_contato, null);
  const projetistasContatos = parseJsonSafe(row.projetistas_contatos, null);

  return {
    // Fornecer id como string (compatibilidade com UI antiga) e numérico nos aliases
    id: String(row.id),
    id_empreendimento: String(row.id),
    id_num: typeof row.id === 'string' ? Number(row.id) : row.id,
    nome_empreendimento: row.nome_empreendimento,
    // Alias usado por partes da UI
    nome: row.nome_empreendimento,
    // Campos conforme schema
    cli_empreendimento: row.cli_empreendimento ?? null,
    cliente: row.cli_empreendimento ?? null,
    endereco_empreendimento: row.endereco_empreendimento ?? null,
    endereco: row.endereco_empreendimento ?? null,
    foto_empreendimento: row.foto_empreendimento ?? null,
    fotos_empreendimento: row.fotos_empreendimento ?? [],
    os_number: row.os_number ?? null,
    sigla_obra: row.sigla_obra ?? null,
    data_inicio_contrato: row.data_inicio_contrato ?? null,
    termino_obra_previsto: row.termino_obra_previsto ?? null,
    data_sem_entrega: row.data_sem_entrega ?? null,
    data_termino_contrato: row.data_termino_contrato ?? null,
    valor_contratual: row.valor_contratual != null ? Number(String(row.valor_contratual)) : null,
    prazo_contratual_dias: row.prazo_contratual_dias != null ? Number(row.prazo_contratual_dias) : null,
    ano_entrega: row.ano_entrega != null ? Number(row.ano_entrega) : null,
    idade_imovel: row.idade_imovel != null ? Number(row.idade_imovel) : null,
    quantidade_pavimentos: row.quantidade_pavimentos != null ? Number(row.quantidade_pavimentos) : null,
    quantidade_conjuntos: row.quantidade_conjuntos != null
      ? Number(row.quantidade_conjuntos)
      : (row.quantidade_conjunto != null ? Number(row.quantidade_conjunto) : null),
    texto_capa_rodape: row.texto_capa_rodape ?? null,
    logo_responsavel: row.logo_responsavel ?? null,
    contatos_proprietario: parseJsonSafe(row.contatos_proprietario, []),
    bm_contato: typeof bmContato === 'string' ? bmContato : (bmContato != null ? JSON.stringify(bmContato) : ''),
    mantenedor_contato: typeof mantenedorContato === 'string' ? mantenedorContato : (mantenedorContato != null ? JSON.stringify(mantenedorContato) : ''),
    projetistas_contatos: typeof projetistasContatos === 'string' ? projetistasContatos : (projetistasContatos != null ? JSON.stringify(projetistasContatos) : ''),
    particularidades: row.particularidades ?? null,
    informacoes_tecnicas: parseJsonSafe(row.informacoes_tecnicas, []),
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

    // Verificar permissões do usuário
    const user = req.user;
    const isAdmin = user && user.role === 'admin';

    // Se não for admin, filtrar apenas empreendimentos vinculados ao usuário
    if (!isAdmin && user && user.sub) {
      const userId = user.sub;
      try {
        // Buscar empreendimentos vinculados ao usuário
        const vinculos = await p.query('SELECT empreendimento_id FROM public.usuarios_empreendimentos WHERE user_id = $1', [userId]);
        const empIds = vinculos.rows.map(r => r.empreendimento_id);

        if (empIds.length === 0) {
          // Usuário não tem empreendimentos vinculados
          return res.json([]);
        }

        // Adicionar filtro de IDs vinculados
        where.push('id = ANY($' + (params.length + 1) + ')');
        params.push(empIds);
      } catch (vincErr) {
        // Se tabela de vínculos não existir, retornar vazio para não-admin
        console.warn('Erro ao buscar vínculos de empreendimentos:', vincErr.message);
        return res.json([]);
      }
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.empreendimentos ${whereClause} ${orderClause} `, params);
    res.json(rows.map(mapEmpreendimentoRow));
  } catch (err) {
    // Log detalhado para diagnóstico de 500
    console.error('[ERROR] GET /api/empreendimentos failed:', err && err.message ? err.message : String(err));
    if (err && err.stack) console.error(err.stack);
    if (shouldReturnEmptyOnDbError(err)) {
      return res.json(memory.empreendimentos.map(mapEmpreendimentoRow));
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg, stack: err && err.stack ? err.stack : null });
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

async function ensureProjetosOriginaisSchema() {
  try {
    const p = requirePool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS public.projetos_originais (
        id BIGSERIAL PRIMARY KEY,
        id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
        nome_projeto TEXT,
        disciplina_projeto TEXT,
        arquivo_projeto TEXT,
        descricao_projeto TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);
  } catch (err) {
    console.warn('[projetos-originais] Falha ao garantir schema:', err instanceof Error ? err.message : String(err));
  }
}

function mapProjetoOriginal(row) {
  return {
    id: row.id,
    id_empreendimento: row.id_empreendimento,
    nome_projeto: row.nome_projeto,
    disciplina_projeto: row.disciplina_projeto,
    arquivo_projeto: row.arquivo_projeto,
    descricao_projeto: row.descricao_projeto,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get('/api/projetos-originais', async (req, res) => {
  try {
    await ensureProjetosOriginaisSchema();
    const p = requirePool();
    const { id_empreendimento, order } = req.query;
    const where = [];
    const params = [];

    if (id_empreendimento) {
      where.push('id_empreendimento = $' + (params.length + 1));
      params.push(Number(id_empreendimento));
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const { rows } = await p.query(`SELECT * FROM public.projetos_originais ${whereClause} ${orderClause}`, params);
    res.json(rows.map(mapProjetoOriginal));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.json([]);
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/projetos-originais/:id', async (req, res) => {
  try {
    await ensureProjetosOriginaisSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rows } = await p.query('SELECT * FROM public.projetos_originais WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapProjetoOriginal(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/projetos-originais', async (req, res) => {
  try {
    await ensureProjetosOriginaisSchema();
    const p = requirePool();
    const b = req.body || {};

    if (!b.id_empreendimento) {
      return res.status(400).json({ error: 'id_empreendimento_required' });
    }

    const sql = `INSERT INTO public.projetos_originais(
      id_empreendimento, nome_projeto, disciplina_projeto, arquivo_projeto, descricao_projeto
    ) VALUES($1,$2,$3,$4,$5) RETURNING *`;

    const params = [
      Number(b.id_empreendimento),
      b.nome_projeto ?? null,
      b.disciplina_projeto ?? null,
      b.arquivo_projeto ?? null,
      b.descricao_projeto ?? null,
    ];

    const { rows } = await p.query(sql, params);
    res.status(201).json(mapProjetoOriginal(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(500).json({ error: 'database_unavailable' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/projetos-originais/:id', async (req, res) => {
  try {
    await ensureProjetosOriginaisSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const b = req.body || {};

    const sql = `UPDATE public.projetos_originais SET
      id_empreendimento = COALESCE($1, id_empreendimento),
      nome_projeto = COALESCE($2, nome_projeto),
      disciplina_projeto = COALESCE($3, disciplina_projeto),
      arquivo_projeto = COALESCE($4, arquivo_projeto),
      descricao_projeto = COALESCE($5, descricao_projeto),
      updated_at = now()
    WHERE id = $6 RETURNING *`;

    const params = [
      b.id_empreendimento ? Number(b.id_empreendimento) : null,
      b.nome_projeto ?? null,
      b.disciplina_projeto ?? null,
      b.arquivo_projeto ?? null,
      b.descricao_projeto ?? null,
      id,
    ];

    const { rows } = await p.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapProjetoOriginal(rows[0]));
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/projetos-originais/:id', async (req, res) => {
  try {
    await ensureProjetosOriginaisSchema();
    const p = requirePool();
    const id = Number(req.params.id);
    const { rowCount } = await p.query('DELETE FROM public.projetos_originais WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    if (shouldReturnEmptyOnDbError(err)) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
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
    const normalizedNome = String(b.nome_empreendimento ?? b.nome ?? '').trim();
    const normalizedCliente = String(b.cliente ?? b.cli_empreendimento ?? '').trim();
    const normalizedOs = String(b.os_number ?? '').trim();
    const normalizedSigla = String(b.sigla_obra ?? '').trim();
    const normalizedEndereco = String(b.endereco ?? b.endereco_empreendimento ?? '').trim();

    const existing = await p.query(
      `SELECT *
       FROM public.empreendimentos
       WHERE lower(trim(nome_empreendimento)) = lower(trim($1))
         AND lower(trim(COALESCE(cli_empreendimento, ''))) = lower(trim($2))
         AND lower(trim(COALESCE(os_number, ''))) = lower(trim($3))
         AND lower(trim(COALESCE(sigla_obra, ''))) = lower(trim($4))
         AND lower(trim(COALESCE(endereco_empreendimento, ''))) = lower(trim($5))
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedNome, normalizedCliente, normalizedOs, normalizedSigla, normalizedEndereco]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'duplicate_empreendimento', existing: mapEmpreendimentoRow(existing.rows[0]) });
    }

    // Mantém a sequence em sincronia para evitar 23505 em ambientes com inserts manuais.
    await p.query(`
      SELECT setval(
        pg_get_serial_sequence('public.empreendimentos', 'id'),
        COALESCE((SELECT MAX(id) FROM public.empreendimentos), 1),
        true
      )
    `);

    const sql = `INSERT INTO public.empreendimentos(
      nome_empreendimento, cli_empreendimento, endereco_empreendimento, foto_empreendimento, os_number, sigla_obra,
      data_inicio_contrato, termino_obra_previsto, data_sem_entrega, data_termino_contrato,
      valor_contratual, prazo_contratual_dias
    ) VALUES(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING * `;
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
      const candidate = {
        nome_empreendimento: (req.body?.nome_empreendimento ?? req.body?.nome) ?? null,
        cli_empreendimento: (req.body?.cliente ?? req.body?.cli_empreendimento) ?? null,
        os_number: req.body?.os_number ?? null,
        sigla_obra: req.body?.sigla_obra ?? null,
        endereco_empreendimento: (req.body?.endereco ?? req.body?.endereco_empreendimento) ?? null,
      };
      const duplicate = memory.empreendimentos.find((item) =>
        String(item.nome_empreendimento || '').trim().toLowerCase() === String(candidate.nome_empreendimento || '').trim().toLowerCase() &&
        String(item.cli_empreendimento || '').trim().toLowerCase() === String(candidate.cli_empreendimento || '').trim().toLowerCase() &&
        String(item.os_number || '').trim().toLowerCase() === String(candidate.os_number || '').trim().toLowerCase() &&
        String(item.sigla_obra || '').trim().toLowerCase() === String(candidate.sigla_obra || '').trim().toLowerCase() &&
        String(item.endereco_empreendimento || '').trim().toLowerCase() === String(candidate.endereco_empreendimento || '').trim().toLowerCase()
      );
      if (duplicate) {
        return res.status(409).json({ error: 'duplicate_empreendimento', existing: mapEmpreendimentoRow(duplicate) });
      }
      const created = {
        id: memoryIdSeq++,
        nome_empreendimento: (req.body?.nome_empreendimento ?? req.body?.nome) ?? null,
        cli_empreendimento: (req.body?.cliente ?? req.body?.cli_empreendimento) ?? null,
        endereco_empreendimento: (req.body?.endereco ?? req.body?.endereco_empreendimento) ?? null,
        os_number: req.body?.os_number ?? null,
        sigla_obra: req.body?.sigla_obra ?? null,
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
    fotos_empreendimento = COALESCE($5, fotos_empreendimento),
    os_number = COALESCE($6, os_number),
    sigla_obra = COALESCE($7, sigla_obra),
    data_inicio_contrato = COALESCE($8, data_inicio_contrato),
    termino_obra_previsto = COALESCE($9, termino_obra_previsto),
    data_sem_entrega = COALESCE($10, data_sem_entrega),
    data_termino_contrato = COALESCE($11, data_termino_contrato),
    valor_contratual = COALESCE($12, valor_contratual),
    prazo_contratual_dias = COALESCE($13, prazo_contratual_dias),
    contatos_proprietario = COALESCE($14, contatos_proprietario),
    ano_entrega = COALESCE($15, ano_entrega),
    idade_imovel = COALESCE($16, idade_imovel),
    quantidade_pavimentos = COALESCE($17, quantidade_pavimentos),
    quantidade_conjunto = COALESCE($18, quantidade_conjunto),
    texto_capa_rodape = COALESCE($19, texto_capa_rodape),
    logo_responsavel = COALESCE($20, logo_responsavel),
    bm_contato = COALESCE($21, bm_contato),
    mantenedor_contato = COALESCE($22, mantenedor_contato),
    projetistas_contatos = COALESCE($23, projetistas_contatos),
    particularidades = COALESCE($24, particularidades),
    informacoes_tecnicas = COALESCE($25, informacoes_tecnicas)
    WHERE id = $26 RETURNING * `;
    const nn2 = (v) => (v === '' || v === undefined || v === null ? null : v);
    const params = [
      nn2(b.nome_empreendimento ?? b.nome),
      nn2(b.cliente ?? b.cli_empreendimento),
      nn2(b.endereco ?? b.endereco_empreendimento),
      nn2(b.foto_empreendimento),
      nn2(b.fotos_empreendimento),
      nn2(b.os_number),
      nn2(b.sigla_obra),
      nn2(b.data_inicio_contrato),
      nn2(b.termino_obra_previsto),
      nn2(b.data_sem_entrega),
      nn2(b.data_termino_contrato),
      nn2(b.valor_contratual),
      nn2(b.prazo_contratual_dias),
      // contatos_proprietario (JSONB)
      nn2(b.contatos_proprietario),
      nn2(b.ano_entrega),
      nn2(b.idade_imovel),
      nn2(b.quantidade_pavimentos),
      nn2(b.quantidade_conjuntos),
      nn2(b.texto_capa_rodape),
      nn2(b.logo_responsavel),
      nn2(b.bm_contato),
      nn2(b.mantenedor_contato),
      nn2(b.projetistas_contatos),
      nn2(b.particularidades),
      nn2(b.informacoes_tecnicas),
      id,
    ];
    // Ensure JSONB params are sent as JSON strings to Postgres when needed
    try {
      // fotos_empreendimento is at index 4 (0-based)
      if (params[4] !== null && params[4] !== undefined) {
        const v = params[4];
        if (typeof v === 'object') params[4] = JSON.stringify(v);
      }
      // contatos_proprietario is at index 13 (0-based)
      if (params[13] !== null && params[13] !== undefined) {
        const v = params[13];
        if (typeof v === 'object') params[13] = JSON.stringify(v);
      }
      // bm_contato is at index 20 (0-based)
      if (params[20] !== null && params[20] !== undefined) {
        const v = params[20];
        params[20] = typeof v === 'object' ? JSON.stringify(v) : JSON.stringify(String(v));
      }
      // mantenedor_contato is at index 21 (0-based)
      if (params[21] !== null && params[21] !== undefined) {
        const v = params[21];
        params[21] = typeof v === 'object' ? JSON.stringify(v) : JSON.stringify(String(v));
      }
      // projetistas_contatos is at index 22 (0-based)
      if (params[22] !== null && params[22] !== undefined) {
        const v = params[22];
        params[22] = typeof v === 'object' ? JSON.stringify(v) : JSON.stringify(String(v));
      }
      // informacoes_tecnicas is text/json text in legacy databases at index 24 (0-based)
      if (params[24] !== null && params[24] !== undefined && typeof params[24] === 'object') {
        params[24] = JSON.stringify(params[24]);
      }
    } catch (e) { /* ignore */ }
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
    const { rows } = await p.query(`SELECT * FROM public.unidades_empreendimento ${whereClause} ${orderClause} `, params);
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

    const sql = `INSERT INTO public.unidades_empreendimento(
      id_empreendimento, unidade_empreendimento, cliente_unidade, metragem_unidade, escopo_unidade, contatos
    ) VALUES($1, $2, $3, $4, $5, $6:: jsonb) RETURNING * `;
    const params = [idEmp, nomeUnidade, cliente, metragem, escopo, toJson(contatos)];
    let rows;
    try {
      const result = await p.query(sql, params);
      rows = result.rows;
    } catch (insertErr) {
      const code = insertErr && typeof insertErr === 'object' && 'code' in insertErr ? insertErr.code : undefined;
      const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
      const isPkSeqMismatch = code === '23505' && msg.includes('unidades_empreendimento_pkey');
      if (!isPkSeqMismatch) throw insertErr;

      // Corrige sequence quando estiver atrás do MAX(id) e tenta novamente uma vez.
      await p.query(`
        SELECT setval(
          pg_get_serial_sequence('public.unidades_empreendimento', 'id'),
          COALESCE((SELECT MAX(id) FROM public.unidades_empreendimento), 1),
          true
        )
      `);

      const retry = await p.query(sql, params);
      rows = retry.rows;
    }
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
    contatos = COALESCE($6:: jsonb, contatos)
    WHERE id = $7 RETURNING * `;
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
    const { status_formulario, order, nome_formulario } = req.query;
    const where = [];
    const params = [];
    if (status_formulario) { where.push('status_formulario = $' + (params.length + 1)); params.push(String(status_formulario)); }
    if (nome_formulario) { where.push('nome_formulario ILIKE $' + (params.length + 1)); params.push(`%${String(nome_formulario)}%`); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderClause = buildOrderClause(typeof order === 'string' ? order : undefined);
    const sql = `SELECT * FROM public.formularios_vistoria ${whereClause} ${orderClause}`;
    const { rows } = await p.query(sql, params);
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
    const sql = `INSERT INTO public.formularios_vistoria(
      nome_formulario, descricao_formulario, status_formulario, secoes
    ) VALUES(
      $1, $2, $3, $4
    ) RETURNING * `;
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
    WHERE id = $5 RETURNING * `;
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
      if (search) { where.push('(email ILIKE $1 OR nome ILIKE $1)'); params.push(`% ${String(search)}% `); }
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
    const role = (typeof b.role !== 'undefined' && b.role !== null)
      ? (String(b.role).toLowerCase() === 'admin' ? 'admin' : (String(b.role).toLowerCase() === 'cliente' ? 'cliente' : 'user'))
      : null;
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
    perfil = COALESCE($5:: jsonb, perfil)
        WHERE id = $6 RETURNING id, email, nome, role, perfil_cliente, perfil, created_at, updated_at`;
        const params = [nome, role, perfil_cliente, newPwd ? hashPassword(newPwd) : null, toJson(perfil), id];
        const up = await p.query(sql, params);
        if (!up.rows.length) return res.status(404).json({ error: 'not_found' });
        row = up.rows[0];
      } catch (errUp) {
        // Fallback: tentar atualizar sem tocar a coluna `perfil_cliente` (algumas instalações não têm essa coluna)
        const sql2 = `UPDATE public.usuarios SET
  nome = COALESCE($1, nome),
    role = COALESCE($2, role),
    password_hash = COALESCE($3, password_hash),
    perfil = COALESCE($4:: jsonb, perfil)
        WHERE id = $5 RETURNING id, email, nome, role, perfil, created_at, updated_at`;
        const params2 = [nome, role, newPwd ? hashPassword(newPwd) : null, toJson(perfil), id];
        const up2 = await p.query(sql2, params2);
        if (!up2.rows.length) return res.status(404).json({ error: 'not_found' });
        row = up2.rows[0];

        // Em instalações onde a coluna `perfil_cliente` existe mas o UPDATE original falhou,
        // tentamos setar `perfil_cliente` separadamente sem tocar no JSON para evitar problemas
        // com casting JSON. Ignoramos erros aqui (coluna pode não existir).
        try {
          if (typeof perfil_cliente !== 'undefined' && perfil_cliente !== null) {
            await p.query('UPDATE public.usuarios SET perfil_cliente = $1 WHERE id = $2', [perfil_cliente, id]);
            // Recarregar a linha atualizada
            const { rows: refreshed } = await p.query('SELECT id, email, nome, role, perfil_cliente, perfil, created_at, updated_at FROM public.usuarios WHERE id = $1', [id]);
            if (refreshed && refreshed.length) row = refreshed[0];
          }
        } catch (e) {
          // ignore
        }
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

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const u = requireAdmin(req, res); if (!u) return;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    if (String(u.id) === String(id) || String(u.sub) === String(id)) {
      return res.status(400).json({ error: 'cannot_delete_self' });
    }

    try {
      const p = requirePool();
      await p.query('BEGIN');
      try {
        try {
          await p.query('DELETE FROM public.usuarios_empreendimentos WHERE user_id = $1', [id]);
        } catch (linkErr) {
          const code = linkErr && typeof linkErr === 'object' && 'code' in linkErr ? linkErr.code : undefined;
          const msg = linkErr instanceof Error ? linkErr.message : String(linkErr);
          const missingLinkTable = code === '42P01' || msg.toLowerCase().includes('usuarios_empreendimentos') && msg.toLowerCase().includes('does not exist');
          if (!missingLinkTable) throw linkErr;
          console.warn('[/api/usuarios DELETE] usuarios_empreendimentos table missing; continuing delete from usuarios');
        }
        const { rowCount } = await p.query('DELETE FROM public.usuarios WHERE id = $1', [id]);
        if (!rowCount) {
          await p.query('ROLLBACK');
          return res.status(404).json({ error: 'not_found' });
        }
        await p.query('COMMIT');
        return res.json({ ok: true });
      } catch (e) {
        await p.query('ROLLBACK');
        throw e;
      }
    } catch (err) {
      if (!shouldReturnEmptyOnDbError(err)) throw err;
      const before = memory.usuarios.length;
      memory.usuarios = memory.usuarios.filter(x => Number(x.id) !== id);
      memory.usuarios_empreendimentos = memory.usuarios_empreendimentos.filter(x => Number(x.user_id) !== id);
      if (memory.usuarios.length === before) return res.status(404).json({ error: 'not_found' });
      return res.json({ ok: true });
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
          await p.query(`INSERT INTO public.usuarios_empreendimentos(user_id, empreendimento_id) VALUES ${values} `, [userId, ...normIds]);
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

// Endpoint administrativo para corrigir URLs antigas de imagens
app.post('/api/admin/fix-image-urls', async (req, res) => {
  try {
    const p = requirePool();
    const baseUrl = getServerBaseUrl();
    let totalUpdated = 0;

    console.log('🔧 Iniciando correção de URLs de imagens...');

    // 1. Atualizar relatorios_semanais
    const { rows: relatorios } = await p.query('SELECT id, fotos FROM relatorios_semanais WHERE fotos IS NOT NULL');

    for (const relatorio of relatorios) {
      if (!relatorio.fotos || !Array.isArray(relatorio.fotos)) continue;

      let needsUpdate = false;
      const updatedFotos = relatorio.fotos.map(foto => {
        if (foto.url && foto.url.startsWith('/api/')) {
          needsUpdate = true;
          return { ...foto, url: `${baseUrl}${foto.url}` };
        }
        return foto;
      });

      if (needsUpdate) {
        await p.query('UPDATE relatorios_semanais SET fotos = $1 WHERE id = $2', [updatedFotos, relatorio.id]);
        totalUpdated++;
      }
    }

    // 2. Atualizar lista_documentos_report
    const { rows: documentos } = await p.query('SELECT id, documentos FROM lista_documentos_report WHERE documentos IS NOT NULL');

    for (const doc of documentos) {
      if (!doc.documentos || !Array.isArray(doc.documentos)) continue;

      let needsUpdate = false;
      const updatedDocs = doc.documentos.map(item => {
        if (item.fotos && Array.isArray(item.fotos)) {
          const updatedFotos = item.fotos.map(foto => {
            if (foto.url && foto.url.startsWith('/api/')) {
              needsUpdate = true;
              return { ...foto, url: `${baseUrl}${foto.url}` };
            }
            return foto;
          });
          return { ...item, fotos: updatedFotos };
        }
        return item;
      });

      if (needsUpdate) {
        await p.query('UPDATE lista_documentos_report SET documentos = $1 WHERE id = $2', [updatedDocs, doc.id]);
        totalUpdated++;
      }
    }

    console.log(`✅ ${totalUpdated} registros atualizados`);
    res.json({ success: true, updated: totalUpdated });
  } catch (err) {
    console.error('❌ Erro ao corrigir URLs:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Admin: listar tabelas do banco
app.get('/api/admin/db-tables', async (req, res) => {
  try {
    const u = requireAdmin(req, res); if (!u) return;
    const p = requirePool();
    const tables = await p.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as col_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const result = {};
    for (const row of tables.rows) {
      try {
        const count = await p.query(`SELECT COUNT(*) as cnt FROM ${row.table_name}`);
        result[row.table_name] = {
          columns: row.col_count,
          records: Number(count.rows[0].cnt)
        };
      } catch {
        result[row.table_name] = { columns: row.col_count, records: 'erro ao contar' };
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Atividades Padrão ----
const mapAtividadeRow = (row) => ({
  id: row.id,
  funcao: row.funcao,
  descricao_atividade: row.descricao_atividade,
  recorrencia: row.recorrencia,
  frequencia: row.frequencia,
  tempo_estimado_horas: row.tempo_estimado_horas != null ? Number(row.tempo_estimado_horas) : null,
  id_empreendimento: row.id_empreendimento,
  nome_empreendimento: row.nome_empreendimento,
  id_unidade: row.id_unidade,
  nome_unidade: row.nome_unidade,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

app.get('/api/atividades', async (req, res) => {
  try {
    const p = requirePool();
    const { order, funcao, id_empreendimento, id_unidade } = req.query;
    const conditions = [];
    const params = [];
    if (funcao) { params.push(funcao); conditions.push(`funcao = $${params.length}`); }
    if (id_empreendimento) { params.push(Number(id_empreendimento)); conditions.push(`id_empreendimento = $${params.length}`); }
    if (id_unidade) { params.push(Number(id_unidade)); conditions.push(`id_unidade = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = order === '-created_at' ? 'ORDER BY created_at DESC' : 'ORDER BY created_at ASC';
    const { rows } = await p.query(`SELECT * FROM public.atividades ${where} ${orderClause}`, params);
    res.json(rows.map(mapAtividadeRow));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/atividades/:id', async (req, res) => {
  try {
    const p = requirePool();
    const { rows } = await p.query('SELECT * FROM public.atividades WHERE id = $1', [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapAtividadeRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/atividades', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const { rows } = await p.query(
      `INSERT INTO public.atividades(funcao, descricao_atividade, recorrencia, frequencia, tempo_estimado_horas, id_empreendimento, nome_empreendimento, id_unidade, nome_unidade)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        b.funcao ?? null,
        b.descricao_atividade,
        b.recorrencia ?? null,
        b.frequencia ?? null,
        b.tempo_estimado_horas != null ? Number(b.tempo_estimado_horas) : null,
        b.id_empreendimento ? Number(b.id_empreendimento) : null,
        b.nome_empreendimento ?? null,
        b.id_unidade ? Number(b.id_unidade) : null,
        b.nome_unidade ?? null,
      ]
    );
    res.status(201).json(mapAtividadeRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/atividades/:id', async (req, res) => {
  try {
    const p = requirePool();
    const b = req.body || {};
    const { rows } = await p.query(
      `UPDATE public.atividades SET
        funcao = COALESCE($1, funcao),
        descricao_atividade = COALESCE($2, descricao_atividade),
        recorrencia = COALESCE($3, recorrencia),
        frequencia = COALESCE($4, frequencia),
        tempo_estimado_horas = COALESCE($5, tempo_estimado_horas),
        id_empreendimento = $6,
        nome_empreendimento = COALESCE($7, nome_empreendimento),
        id_unidade = $8,
        nome_unidade = COALESCE($9, nome_unidade),
        updated_at = now()
       WHERE id = $10 RETURNING *`,
      [
        b.funcao ?? null,
        b.descricao_atividade ?? null,
        b.recorrencia ?? null,
        b.frequencia ?? null,
        b.tempo_estimado_horas != null ? Number(b.tempo_estimado_horas) : null,
        b.id_empreendimento ? Number(b.id_empreendimento) : null,
        b.nome_empreendimento ?? null,
        b.id_unidade ? Number(b.id_unidade) : null,
        b.nome_unidade ?? null,
        Number(req.params.id),
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(mapAtividadeRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/atividades/:id', async (req, res) => {
  try {
    const p = requirePool();
    const { rowCount } = await p.query('DELETE FROM public.atividades WHERE id = $1', [Number(req.params.id)]);
    if (!rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---- Servir frontend estático (SPA) ----
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Backward compatibility: old QR codes may point to backend host.
// Redirect them to the public frontend using hash routing (works even without SPA rewrites).
app.get('/GaleriaRelatorioSaida', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  return res.redirect(302, `https://front-fitout.onrender.com/#/GaleriaRelatorioSaida${query}`);
});

// Fallback para SPA: redirecionar qualquer rota não-API para index.html (React Router vai lidar)
app.get('*', (req, res) => {
  // Não redirecionar se for uma rota de API que não foi tratada
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'not_found', path: req.path });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ---- Iniciar servidor ----
// IMPORTANTE: app.listen() deve estar DEPOIS de todas as definições de rotas
const DEFAULT_PORT = 5000;
const PORT = Number(process.env.PORT ?? DEFAULT_PORT);
try {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
} catch (err) {
  console.error('Erro ao iniciar servidor:', err && err.message ? err.message : String(err));
  process.exit(1);
}

// Global error handler: ensure all errors return JSON (including multer errors)
app.use((err, req, res, next) => {
  try {
    if (res.headersSent) return next(err);
    console.error('[GLOBAL ERROR]', err && (err.stack || err.message || String(err)));
    // Multer file size limit
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'file_too_large', message: 'File exceeds size limit' });
    }
    const status = err && err.status ? err.status : 500;
    const msg = err && err.message ? err.message : String(err || 'internal_error');
    res.status(status).json({ error: 'internal_error', message: msg });
  } catch (e) {
    try { console.error('[GLOBAL ERROR][secondary]', e && (e.stack || e.message || String(e))); } catch { }
    next(err);
  }
});
