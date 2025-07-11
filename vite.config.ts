import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { IncomingMessage } from 'http';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        proxy: {
          '/proxy': {
            changeOrigin: true,
            router: (req: IncomingMessage) => {
              // Extract the target URL from the request path
              // e.g., /proxy/https://example.com/api -> https://example.com
              const targetUrlStr = req.url?.substring('/proxy/'.length);
              if (targetUrlStr) {
                try {
                  const targetUrl = new URL(targetUrlStr);
                  return targetUrl.origin;
                } catch (e) {
                  console.error('Invalid URL for proxy router:', e);
                  return '';
                }
              }
              return '';
            },
            rewrite: (path) => {
              // Rewrite the path to be the path of the target URL
              // e.g., /proxy/https://example.com/api/v1 -> /api/v1
              const targetUrlStr = path.substring('/proxy/'.length);
               if (targetUrlStr) {
                try {
                  const targetUrl = new URL(targetUrlStr);
                  return targetUrl.pathname + targetUrl.search;
                } catch (e) {
                  return '';
                }
              }
              return '';
            },
          },
        },
      },
    };
});
