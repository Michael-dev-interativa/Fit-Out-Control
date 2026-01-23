# 🚨 CONFIGURAÇÃO CRÍTICA - Backend API URL

## Problema
O frontend está tentando acessar `/api/auth/me`, `/api/empreendimentos` etc. no **próprio domínio do Vercel** ao invés do backend.

## Solução

### 1️⃣ Configurar variável no Vercel

Acesse: https://vercel.com/seu-username/seu-projeto/settings/environment-variables

Adicione:
```
Key: VITE_API_URL
Value: https://seu-backend.onrender.com
Environments: ✅ Production ✅ Preview ✅ Development
```

⚠️ **ATENÇÃO:** 
- Copie a URL EXATA do seu backend no Render
- NÃO coloque `/` no final
- Exemplo: `https://fitout-backend.onrender.com`

### 2️⃣ Redeploy

Após adicionar a variável:
1. Vá em **Deployments**
2. Clique nos três pontos da última build
3. Clique em **Redeploy**

### 3️⃣ Verificar

Após o deploy:
1. Abra o site em produção
2. Clique em "🔍 Mostrar Debug" na tela de login
3. Verifique se `API_BASE` mostra a URL do seu backend

✅ **Correto:** `API_BASE: https://seu-backend.onrender.com`
❌ **Errado:** `API_BASE: http://localhost:3000` ou `API_BASE: https://fit-out-frontend...vercel.app`

### 4️⃣ Se ainda não funcionar

Execute localmente:
```bash
# Windows PowerShell
$env:VITE_API_URL="https://seu-backend.onrender.com"; npm run build
npm run preview
```

Abra http://localhost:4173 e verifique se funciona. Se funcionar localmente mas não no Vercel, a variável não está sendo injetada corretamente.

## Arquivos importantes

- `src/api/config.js` - Resolve API_BASE usando VITE_API_URL
- `.env.example` - Documentação das variáveis
- `vercel.json` - Configuração do Vercel (se aplicável)
