import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: false,
    host: true
  },
  base: './',
  build: {
    target: 'esnext'
  }
});
