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
            logLevel: 'debug',
            router: (req: IncomingMessage) => {
              const requestUrl = req.url || '';
              console.log(`[Vite Proxy Router] Received request for: ${requestUrl}`);
              const targetUrlStr = requestUrl.substring('/proxy/'.length);
              if (targetUrlStr) {
                try {
                  const targetUrl = new URL(targetUrlStr);
                  console.log(`[Vite Proxy Router] Routing to origin: ${targetUrl.origin}`);
                  return targetUrl.origin;
                } catch (e) {
                  console.error('[Vite Proxy Router] Invalid URL:', e);
                  return '';
                }
              }
              return '';
            },
            rewrite: (path) => {
              console.log(`[Vite Proxy Rewrite] Rewriting path: ${path}`);
              const targetUrlStr = path.substring('/proxy/'.length);
               if (targetUrlStr) {
                try {
                  const targetUrl = new URL(targetUrlStr);
                  const newPath = targetUrl.pathname + targetUrl.search;
                  console.log(`[Vite Proxy Rewrite] Rewritten path: ${newPath}`);
                  return newPath;
                } catch (e) {
                  console.error('[Vite Proxy Rewrite] Invalid URL:', e);
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
