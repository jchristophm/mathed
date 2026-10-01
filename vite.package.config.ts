import { defineConfig } from 'vite';
export default defineConfig({
  build: { outDir: 'dist', lib: { entry: 'src/mathed.ts', formats: ['es'], fileName: 'mathed', cssFileName: 'style' }, rollupOptions: { external: ['katex'] } }
});
