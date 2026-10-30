import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(() => {
  return {
    root: 'public',
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/gelbooru': {
          target: 'https://gelbooru.com',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/gelbooru/, ''),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 BooruBrowser/1.0',
            'Referer': 'https://gelbooru.com/',
          },
        },
      },
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
  };
});
