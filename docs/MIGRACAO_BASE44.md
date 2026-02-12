# 🔄 Guia de Migração: Base44 → Render PostgreSQL

## 📋 Pré-requisitos

1. ✅ Acesso ao painel do Base44
2. ✅ Dados exportados do Base44 em formato CSV
3. ✅ String de conexão do banco Render (já configurada no `.env`)
4. ✅ Backup dos dados (importante!)

---

## 🚀 Passo a Passo Completo

### **Passo 1: Exportar Dados do Base44**

No painel do **Base44**:

1. Acesse cada **Entidade** (tabela) que você deseja migrar:
   - Empreendimentos
   - Unidades
   - Usuários
   - Registros
   - Relatórios
   - etc.

2. Para cada entidade, procure por:
   - Botão **"Exportar"** ou **"Export"**
   - Opção **"Download CSV"** ou **"Export to CSV"**
   - Ou menu **"⋮"** → **"Export Data"**

3. Salve todos os arquivos CSV em uma pasta, por exemplo:
   ```
   C:\exports\base44\
   ├── Empreendimentos.csv
   ├── Unidades.csv
   ├── Usuarios.csv
   ├── RegistrosUnidade.csv
   └── ...
   ```

**💡 Dica:** Nomeie os arquivos conforme o nome da entidade no Base44.

---

### **Passo 2: Configurar DATABASE_URL do Render**

**No arquivo `.env`:**
```bash
DATABASE_URL=postgresql://fitout_user:SENHA@dpg-xxx-a.virginia-postgres.render.com/fitout
```

> 💡 Obtenha esta URL no painel do Render: **Database → Connection String**

---

### **Passo 3: Executar Script de Importação**

Abra o PowerShell na pasta do projeto e execute:

```powershell
npm run migrate:base44
```

O script irá:
1. ✅ Pedir o caminho da pasta com os JSONs exportados
2. ✅ Conectar ao banco Render
3. ✅ Listar arquivos encontrados
4. ✅ Pedir confirmação para cada entidade
5. ✅ Importar dados automaticamente
6. ✅ Mostrar resumo final

---

### **Exemplo de Execução:**

```powershell
PS> npm run migrate:base44

📊 MIGRAÇÃO DE DADOS - Base44 → Render PostgreSQL

Este script importa dados exportados do Base44 (formato JSON).

📁 Cole o caminho da pasta com os arquivos JSON exportados do Base44:
(exemplo: C:\exports\base44)
> C:\Users\Michael\Desktop\exports\base44

✅ Pasta encontrada!
✅ Conectado ao Render PostgreSQL!

🚀 Iniciando importação...

📦 Importando: Empreendimentos → empreendimentos
   📊 12 registros encontrados em Empreendimentos.csv
   ⏳ Importando...
   ✅ 12 registros importados (0 erros)

📦 Importando: Unidades → unidades_empreendimento
   📊 45 registros encontrados em Unidades.csv
   ⏳ Importando...
   ✅ 45 registros importados (0 erros)

...

✅ Total de registros importados: 127

🎉 Importação concluída!
```

---

## � Formato dos Arquivos JSON

Os arquivos exportados do Base44 devem estar em um dos formatos:

### **Formato 1: Array de Objetos (Preferido)**
```json
[
  {
    "nome_empreendimento": "Edifício Central",
    "os_number": "OS-2024-001",
    "valor_contratual": 1500000.00,
    "created": "2024-01-15T10:00:00Z"
  },
  {
    "nome_empreendimento": "Residencial Park",
    "os_number": "OS-2024-002",
    "valor_contratual": 2300000.00,
    "created": "2024-02-20T14:30:00Z"
  }
]
```

### **Formato 2: Objeto Único**
```json
{
  "nome_empreendimento": "Edifício Central",
  "os_number": "OS-2024-001",
  "valor_contratual": 1500000.00,
  "created": "2024-01-15T10:00:00Z"
}
```

**O script automaticamente:**
- ✅ Remove campos internos do Base44 (`_id`, `__v`, `createdBy`, etc.)
- ✅ Converte `created` → `created_at`
- ✅ Converte `updated` → `updated_at`
- ✅ Ignora registros duplicados (`ON CONFLICT DO NOTHING`)

---

## 🔧 Opções Alternativas de Exportação

### **Exportar Via API do Base44** (se disponível)

Se o Base44 disponibilizar API, você pode criar um script customizado:

```javascript
const fetch = require('node-fetch');
const fs = require('fs');

async function exportFromBase44API() {
  const response = await fetch('https://api.base44.com/entities/Empreendimentos', {
    headers: {
      'Authorization': 'Bearer SEU_TOKEN_AQUI'
    }
  });
  
  const data = await response.json();
  
  // Converte para CSV
  const csv = convertToCSV(data);
  fs.writeFileSync('Empreendimentos.csv', csv);
}

function convertToCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}
```

---

## ⚠️ Problemas Comuns e Soluções

### ❌ "Arquivo não encontrado"
**Causa:** Nome do arquivo CSV não corresponde ao esperado

**Solução:** Renomeie os arquivos para:
- `Empreendimentos.csv`
- `Unidades.csv`
- `Usuarios.csv`
- etc.

Ou edite o array `ENTITY_TABLE_MAP` no script.

### ❌ "Column X does not exist"
**Causa:** Campos do Base44 não existem no PostgreSQL

**Solução:** Edite a função `mapBase44ToPostgres()` no script:

```javascript
function mapBase44ToPostgres(entityName, base44Data) {
  const mapped = { ...base44Data };
  
  // Mapear campos específicos
  if (entityName === 'Empreendimentos') {
    mapped.nome_empreendimento = base44Data.nome || base44Data.title;
    mapped.valor_contratual = parseFloat(base44Data.valor || 0);
  }
  
  return mapped;
}
```

### ❌ "Constraint violation"
**Causa:** IDs duplicados ou foreign keys inválidas

**Solução:**
```sql
-- Limpar dados antigos antes de importar
TRUNCATE TABLE empreendimentos CASCADE;
```

### ❌ "Invalid JSON"
**Causa:** Arquivo JSON mal formatado

**Solução:** Valide o JSON em:
- https://jsonlint.com/
- Ou use um editor com validação (VS Code)

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
