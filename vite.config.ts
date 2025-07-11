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
              const requestUrl = req.url || '';
              if (requestUrl.startsWith('/proxy/http')) {
                let targetUrlStr = '';
                try {
                  targetUrlStr = decodeURIComponent(requestUrl.substring('/proxy/'.length));
                  const targetUrl = new URL(targetUrlStr);
                  return targetUrl.origin;
                } catch (e) {
                  console.error(`[Vite Proxy Router] Invalid URL in request: ${targetUrlStr}`, e);
                }
              }
              return 'http://localhost:9999'; // Return a dummy target to prevent crash
            },
            rewrite: (path) => {
              const requestUrl = path || '';
              if (requestUrl.startsWith('/proxy/http')) {
                try {
                  const targetUrlStr = decodeURIComponent(requestUrl.substring('/proxy/'.length));
                  const targetUrl = new URL(targetUrlStr);
                  return targetUrl.pathname + targetUrl.search;
                } catch (e) {
                  // Let the original path go through to show the error
                }
              }
              return path;
            },
          },
        },
      },
    };
});
