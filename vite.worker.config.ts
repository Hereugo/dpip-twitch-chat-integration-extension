import { defineConfig } from 'vite';

// Service worker: ES module single file
export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        target: 'es2020',
        cssCodeSplit: false,
        rollupOptions: {
            input: { worker: './src/worker.ts' },
            output: {
                entryFileNames: 'worker.js',
                format: 'iife',
                inlineDynamicImports: true,
                dir: 'dist',
            },
        },
    },
});
