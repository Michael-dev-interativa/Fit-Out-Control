import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000';

// Try to include rollup visualizer if available (dev-only helper)
let visualizerPlugin = null;
try {
  // dynamic import so build doesn't fail if not installed
  // eslint-disable-next-line no-undef
  const mod = await import('rollup-plugin-visualizer');
  if (mod && mod.visualizer) visualizerPlugin = mod.visualizer({ filename: 'dist/stats.html', open: false });
} catch (e) {
  // ignore if plugin not installed
}

const pwaPlugin = VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        // Respostas de API para leitura offline de telas já visitadas
        urlPattern: /\/api\/.+/,
        handler: 'NetworkFirst',
        method: 'GET',
        options: {
          cacheName: 'fitout-api-get',
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 300, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Arquivos persistidos no banco (endpoint /api/files/:id)
        urlPattern: /\/api\/files\/.+/,
        handler: 'CacheFirst',
        method: 'GET',
        options: {
          cacheName: 'fitout-api-files',
          expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /\/uploads\/.+/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'fitout-uploads',
          expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
    ],
  },
  manifest: {
    name: 'Interativa Fitout',
    short_name: 'Interativa',
    description: 'Gestão de Ativos e Inspeções',
    theme_color: '#2563eb',
    background_color: '#000000',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: '/icon-192.png?v=20260402b', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png?v=20260402b', sizes: '512x512', type: 'image/png' },
    ],
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pwaPlugin].concat(visualizerPlugin ? [visualizerPlugin] : []),
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
        // Não reescrever o caminho: o backend expõe rotas com prefixo /api
      },
      '/health': {
        target: devProxyTarget,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
}) 