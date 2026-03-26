# Instruções rápidas para agentes de código (Copilot / AI)

Este repositório é uma aplicação monolítica Vite + React (frontend) com um backend Node/Express simples no `server.js`. O objetivo deste documento é reunir o conhecimento mínimo necessário para um agente ser produtivo imediatamente.

Principais conceitos (visão geral)
- Arquitetura: frontend (Vite + React em `src/`) e backend Node/Express em `server.js` (raiz). O backend expõe rotas em `/api/*` e acessa Postgres via `pg` (Pool).
- Dados: o banco usa JSON/JSONB em várias colunas; scripts úteis estão em `scripts/` e as definições/DDL em `db/schema.sql`.
- Relatórios PDF/visual: cada relatório tem um viewer em `src/pages/VisualizarInspecao*.jsx`. O padrão de layout é `ReportPageLayout` + `CoverPage` + `ReportContent`.

Comandos úteis
- Rodar frontend em dev: `npm run dev` (Vite)
- Rodar backend localmente: `npm run server` (inicia `server.js`). Para mudar porta: `PORT=5001 npm run server` (Windows PowerShell: `$env:PORT='5001'; npm run server`).
- Inicializar DB test/local: `npm run db:init` (ver `scripts/init-db.js`).
- Outros scripts: `node scripts/*` (import, sync, compress-uploads, migrate-from-base44)

Pontos importantes do código
- Backend: [server.js](server.js) contém CORS, configuração de `ALLOWED_ORIGINS` (env), handlers para `/api/rdos/:id`, `/api/lista-documentos-report/:id` e endpoints de inspeção (ex.: `/api/inspecoes-ar-condicionado`).
  - Para debugging de inserts de inspeção, o handler aceita `DEBUG_INSPECOES=true` para logar SQL e params.
- Cliente API: `src/api/entities.js` e `src/api/base44Client.js` geram entidades (`Empreendimento`, `InspecaoArCondicionado`, etc.). O runtime expõe `base44.entities.*` para compatibilidade com código legado.
- Relatórios: padrão de implementação a seguir (ver exemplo):
  - `ReportPageLayout` controla header/footer, paginação e comportamento de capa.
  - `CoverPage` contém imagens grandes e decorativas; já existe lógica para comprimir imagens (`compressImage`, `useCompressedImage`) — cuidado com CORS em imagens hospedadas externamente.
  - Para adicionar um novo viewer, copie `src/pages/VisualizarInspecaoEletrica.jsx` ou `VisualizarInspecaoArCondicionado.jsx` e ajuste `Inspecao*` entity e componentes de conteúdo.
- Compressão de imagens: vários viewers usam `compressImage()` e `useCompressedImage()` para transformar imagens em DataURL para impressão; esses utilitários já consideram bypass para URLs com restrições CORS (`base44.app/api`).

Convensões e padrões do projeto
- Entidades: use o factory em `src/api/entities.js` — métodos padrão: `list`, `get`, `create`, `update`, `delete`.
- Rotas de inspeção: nomes no backend nem sempre seguem o mesmo termo do frontend (ex.: frontend chamava `inspecoes-eletrica` mas o backend tem `inspecoes-ar-condicionado`). Verifique `src/api/entities.js` para o mapeamento.
- Layout de relatório: todas as páginas `VisualizarInspecao*` usam o mesmo padrão de CSS e breakpoint para impressão A4 (`@page { size: A4 portrait }`). Respeite a estrutura `ReportPageLayout` + `CoverPage` + `ReportContent` para consistência.
- Estilo e CSS: Tailwind + estilos inline dentro dos componentes. Em alterações de impressão, prefira alterar `ReportPageLayout` e os estilos @media print.

Debugging rápido (problemas comuns)
- Porta ocupada: se `server.js` falhar com `EADDRINUSE`, identificar processo e matar (Windows):

```powershell
netstat -ano | findstr :5000
taskkill /PID <pid> /F
$env:PORT='5001'; npm run server
```

- CORS local: configure `ALLOWED_ORIGINS` no ambiente antes de rodar o servidor:

```powershell
$env:ALLOWED_ORIGINS='http://localhost:5173,http://localhost:3000'; npm run server
```

- Investigar `inspecoes` POST com erro: reinicie o backend com `DEBUG_INSPECOES=true` para ver SQL e params:

```powershell
$env:DEBUG_INSPECOES='true'; $env:PORT='5000'; npm run server
```

- PowerShell + curl: atenção ao escape/aspas; prefira `Invoke-RestMethod` com `-Body (ConvertTo-Json $payload)` para evitar problemas de parsing.

Arquivos/chaves para revisão rápida
- Backend: `server.js` (rotas e SQL), `init-database.sql`, `add-documentos-column.sql`, `update-admin.sql` (migrations)
- Scripts úteis: `scripts/init-db.js`, `scripts/import-rdos.js`, `scripts/migrate-from-base44.js` (migração de dados)
- Frontend entry: `src/main.jsx`, rotas e páginas em `src/pages/` (relatórios: `VisualizarInspecao*.jsx`)
- Cliente API: `src/api/entities.js`, `src/api/base44Client.js`, `src/api/*` (config)
- Config / deploy hints: `render.yaml`, `netlify.toml`, `vercel.json`, `docker-compose.yml`

Exemplos rápidos (adicionar novo viewer)
1. Copiar `src/pages/VisualizarInspecaoEletrica.jsx` → `VisualizarInspecaoMyNew.jsx`.
2. Atualizar a entity usada na fetch (`InspecaoMyNew.get(id)`) e o título de capa.
3. Garantir `ReportPageLayout` tem `style={isCover ? { height: '297mm', overflow: 'hidden' } : {}}` e `page-content` com `overflow: 'visible'`.
4. Testar impressão via botão "Gerar PDF".

O que eu NÃO devo mudar
- Não alterar a estrutura das rotas no `server.js` sem validar com DB e clientes existentes (trocando nomes de endpoints pode quebrar histórico).
- Evitar converter back-end monolítico para serviço sem um plano de migração; muitos scripts e nomes de tabela esperam o layout atual.

Se algo estiver incerto
- Peça logs do servidor (`DEBUG_INSPECOES=true`) e o corpo da requisição que falhou (Network tab) — isso é frequentemente suficiente para diagnosticar problemas de SQL/JSONB.

Feedback
- Avise o que ficou incompleto ou quais áreas você quer que eu detalhe mais (ex.: explicar `src/api/entities.js` internals, descrever a modelagem JSONB no banco, ou adicionar exemplos de testes Playwright).

---
Peça de follow-up: quer que eu gere automaticamente um exemplo de novo viewer baseado em `VisualizarInspecaoEletrica.jsx` e um checklist de QA para impressão A4?