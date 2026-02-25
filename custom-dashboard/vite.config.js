import { defineConfig } from 'vite';

export default defineConfig({
  base: '/dashboard/',
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/zammad-api': {
        target: 'https://supportticket.pansophictech.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/zammad-api/, ''),
      },
    },
  },
});
