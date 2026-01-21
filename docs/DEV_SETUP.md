# Ambiente de Desenvolvimento (Windows)

## Pré-requisitos
- Node.js 18+
- Docker Desktop
- PowerShell

## Variáveis de ambiente
Crie um arquivo `.env` na raiz baseado em `.env.example`:

```
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fitout
```

## Subir Postgres com Docker
```powershell
Push-Location "C:\Users\Michael Rocha\Desktop\Softwares\fitout"
# Inicializa Postgres
docker compose up -d
# Verifica saúde do container
docker ps
Pop-Location
```

## Instalar dependências
```powershell
Push-Location "C:\Users\Michael Rocha\Desktop\Softwares\fitout"
# Instala dependências
npm install
Pop-Location
```

## Rodar o backend
```powershell
Push-Location "C:\Users\Michael Rocha\Desktop\Softwares\fitout"
npm run server
Pop-Location
```

## Rodar o frontend (Vite)
```powershell
Push-Location "C:\Users\Michael Rocha\Desktop\Softwares\fitout"
npm run dev
Pop-Location
```

Com o proxy do Vite configurado, chamadas para `/api/...` e `/health` no frontend serão encaminhadas para o backend em `http://localhost:3000` durante o desenvolvimento.

## Teste rápido
- Backend: acesse http://localhost:3000/health — deve retornar `{ status: "ok", db: { ok: true } }` se o Postgres estiver acessível e `DATABASE_URL` configurado.
- Frontend: acesse http://localhost:5173 e faça uma requisição a `/health` ou `/api/health` — deve responder via proxy.

## Dicas
- Se já possui Postgres externo, ajuste `DATABASE_URL` no `.env`.
- Para aplicar seu schema SQL dentro do container:
```powershell
# Copia schema para o container
docker cp .\db\schema.sql fitout_postgres:/schema.sql
# Executa no banco local
docker exec -e PGPASSWORD=postgres fitout_postgres psql -U postgres -d fitout -f /schema.sql
```
