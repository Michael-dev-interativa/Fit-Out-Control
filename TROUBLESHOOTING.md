# ⚠️ DIAGNÓSTICO: Backend não responde

## Problema Identificado

Baseado nos logs do console:
- `404` em `/favicon.html` 
- `404` em `/api/auth/me`
- `404` em `/api/empreendimentos`
- `LIST empreendimentos failed`

**Causa:** O `VITE_API_URL` não está configurado ou o backend não está rodando.

---

## Solução Passo a Passo

### 1️⃣ Configure o Backend URL no Vercel

**Acesse:** [Vercel Project Settings](https://vercel.com/dashboard)

1. Vá em seu projeto → **Settings** → **Environment Variables**
2. Adicione:
   ```
   Name:  VITE_API_URL
   Value: https://seu-backend.onrender.com
   ```
   ⚠️ **IMPORTANTE:** Sem "/" no final!

3. Marque: ✅ Production ✅ Preview ✅ Development
4. Clique em **Save**
5. **Redeploy** o projeto

### 2️⃣ Verifique o Backend (Render)

Acesse a URL do backend diretamente no navegador:
```
https://seu-backend.onrender.com/health
```

**Deve retornar:**
```json
{
  "status": "ok",
  "db": {
    "ok": true,
    "value": 1
  }
}
```

Se retornar `404` ou erro → o backend não está rodando!

### 3️⃣ Verifique os Logs (após deploy)

Abra o Console do navegador (F12) e procure:

✅ **Correto:**
```
[API Config] API_BASE resolved to: https://seu-backend.onrender.com
[API Config] VITE_API_URL from env: https://seu-backend.onrender.com
[API] LIST empreendimentos -> https://seu-backend.onrender.com/api/empreendimentos
```

❌ **Errado:**
```
[API Config] Using localhost fallback
[API] LIST empreendimentos -> http://localhost:3000/api/empreendimentos
```

---

## Como Testar Localmente

1. Crie o arquivo `.env.local`:
   ```bash
   VITE_API_URL=http://localhost:3000
   ```

2. Rode backend e frontend:
   ```bash
   npm run server   # Terminal 1
   npm run dev      # Terminal 2
   ```

3. Acesse: http://localhost:5173

---

## Checklist de Troubleshooting

- [ ] `VITE_API_URL` configurado no Vercel?
- [ ] Backend está online no Render?
- [ ] `/health` retorna 200 OK?
- [ ] Console mostra URL correta?
- [ ] Redeploy foi feito após adicionar variável?

---

## URLs de Referência

- Frontend (Vercel): https://seu-site.vercel.app
- Backend (Render): https://seu-backend.onrender.com
- Health Check: https://seu-backend.onrender.com/health
