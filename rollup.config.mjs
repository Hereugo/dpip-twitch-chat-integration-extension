// rollup.config.js
import { defineConfig } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

export default defineConfig([
    {
        input: './src/content.js',
        output: {
            file: './dist/content.js',
            format: 'esm',
        },
        plugins: [nodeResolve(), commonjs()],
    },
    {
        input: './src/worker.js',
        output: {
            file: './dist/worker.js',
            format: 'esm',
        },
        plugins: [nodeResolve(), commonjs()],
    },
]);
