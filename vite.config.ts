import vue from '@vitejs/plugin-vue';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // treat all tags with a dash as custom elements
          isCustomElement: (tag) => tag.includes('-'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@webawesome': '@awesome.me/webawesome/dist/components',
    },
    dedupe: ['@awesome.me/webawesome'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "/src/styles/_design-tokens.scss";`,
      },
    },
  },
});
