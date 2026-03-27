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
    globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
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
    name: 'Fit Out Control',
    short_name: 'FitOut',
    description: 'Gestão de Ativos e Inspeções',
    theme_color: '#2563eb',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
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