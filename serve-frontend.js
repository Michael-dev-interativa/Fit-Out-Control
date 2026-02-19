import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando servidor frontend...');
console.log('📁 Servindo arquivos de:', path.join(__dirname, 'dist'));

// Enable gzip compression for static assets
app.use(compression());

// Serve arquivos estáticos do diretório dist
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d', // Cache de 1 dia para assets
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA fallback - TODAS as rotas não encontradas retornam index.html
app.get('*', (req, res) => {
  console.log(`📄 Serving index.html for: ${req.path}`);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Frontend rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});

