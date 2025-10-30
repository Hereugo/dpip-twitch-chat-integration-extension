import { defineConfig } from 'vite';

// Content script: IIFE single file, no code-splitting
export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        target: 'es2020',
        cssCodeSplit: false,
        rollupOptions: {
            input: { content: './src/content.ts' },
            output: {
                entryFileNames: 'content.js',
                format: 'iife',
                inlineDynamicImports: true,
                dir: 'dist',
            },
        },
    },
});
