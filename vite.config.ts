import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site at https://<user>.github.io/penrith-3d/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/penrith-3d/' : '/',
  server: { port: 5173 },
}));
