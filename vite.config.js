import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()].concat(visualizerPlugin ? [visualizerPlugin] : []),
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