import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'demo-dist', rollupOptions: { input: { demo: 'index.html', embedded: 'examples/embedded.html' } } } });
