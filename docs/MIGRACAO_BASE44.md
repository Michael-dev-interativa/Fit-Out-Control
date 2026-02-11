# 🔄 Guia de Migração: Base44 → Render PostgreSQL

## 📋 Pré-requisitos

1. ✅ Acesso ao painel do Base44/Supabase
2. ✅ String de conexão do banco origem
3. ✅ String de conexão do banco Render (já configurada no `.env`)
4. ✅ Backup dos dados (importante!)

---

## 🚀 Método 1: Script Automatizado (Recomendado)

### Passo 1: Obter String de Conexão do Base44

**No painel do Base44 ou Supabase:**
1. Acesse: **Database → Settings**
2. Procure por: **Connection String** ou **Database URL**
3. Copie a URL no formato:
   ```
   postgresql://username:password@host:port/database
   ```

### Passo 2: Configurar DATABASE_URL do Render

**No arquivo `.env`:**
```bash
DATABASE_URL=postgresql://fitout_user:SENHA@dpg-xxx-a.virginia-postgres.render.com/fitout
```

> 💡 Obtenha esta URL no painel do Render: Database → Connection String

### Passo 3: Executar Script de Migração

```powershell
# Rodar o script
node scripts/migrate-from-base44.js
```

O script irá:
1. ✅ Pedir a URL do Base44
2. ✅ Conectar aos dois bancos
3. ✅ Listar tabelas encontradas
4. ✅ Perguntar confirmação para cada tabela
5. ✅ Migrar dados em lotes
6. ✅ Mostrar resumo final

---

## 🛠️ Método 2: Dump/Restore Manual

### Opção A: Usando pg_dump (Windows)

```powershell
# 1. Exportar do Base44
pg_dump "postgresql://user:pass@base44-host/db" -f backup.sql

# 2. Importar para Render
psql "$env:DATABASE_URL" -f backup.sql
```

### Opção B: Usando Supabase CLI

```powershell
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Fazer backup
supabase db dump --db-url "postgresql://..." > backup.sql

# 3. Restaurar no Render
psql "$env:DATABASE_URL" -f backup.sql
```

---

## ⚠️ Problemas Comuns e Soluções

### ❌ "SSL required"
**Solução:**
```javascript
// O script já trata isso com:
ssl: { rejectUnauthorized: false }
```

### ❌ "Constraint violation"
**Causa:** IDs duplicados ou foreign keys inválidas

**Solução:**
```sql
-- Limpar dados antigos antes de migrar
TRUNCATE TABLE usuarios CASCADE;
```

### ❌ "Permission denied"
**Causa:** Falta de permissão no banco destino

**Solução:** No Render Dashboard:
- Database → Settings → Reset Database (cuidado!)
- Ou ajuste permissões

---

## 📊 Verificação Pós-Migração

Execute no banco Render:

```sql
-- Verificar contagem de registros
SELECT 
  'usuarios' as tabela, COUNT(*) as total FROM usuarios
UNION ALL
SELECT 'empreendimentos', COUNT(*) FROM empreendimentos
UNION ALL
SELECT 'unidades_empreendimento', COUNT(*) FROM unidades_empreendimento;
```

Compare com o banco origem.

---

## 🔐 Migrar Usuários e Senhas

⚠️ **IMPORTANTE:** Senhas no Base44 podem estar em formato diferente.

### Se Base44 usa Supabase Auth:
```javascript
// As senhas não podem ser migradas diretamente
// Opções:
// 1. Usuários fazem "Esqueci minha senha"
// 2. Admin reseta senhas manualmente
// 3. Criar senha padrão temporária
```

### Script para resetar senhas:

```javascript
// Em scripts/reset-passwords.js
import { hashPassword } from '../server.js'; // Sua função de hash

const TEMP_PASSWORD = 'TrocarSenha123!';
const hash = hashPassword(TEMP_PASSWORD);

await pool.query(
  'UPDATE usuarios SET password_hash = $1',
  [hash]
);

console.log('✅ Senhas resetadas. Padrão:', TEMP_PASSWORD);
```

---

## 🎯 Checklist Final

Após migração, verifique:

- [ ] ✅ Todas as tabelas foram migradas
- [ ] ✅ Contagem de registros confere
- [ ] ✅ Login funciona com usuários migrados
- [ ] ✅ Relações (foreign keys) estão intactas
- [ ] ✅ Imagens/arquivos funcionam (migrar separadamente)
- [ ] ✅ Backup do banco origem guardado

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique logs do script
2. Confira permissões no Render
3. Valide strings de conexão
4. Teste com uma tabela pequena primeiro

---

## 🔄 Migração Incremential

Para adicionar dados novos sem duplicar:

```javascript
// O script já usa ON CONFLICT DO NOTHING
// Ou rode apenas tabelas específicas:

const TABLES = ['empreendimentos', 'unidades_empreendimento'];
```

Edite o array no script antes de executar.
