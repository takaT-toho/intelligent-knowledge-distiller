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
              console.log(`[VITE_PROXY_ROUTER] Incoming request: ${requestUrl}`);
              if (!requestUrl.startsWith('/proxy/http')) {
                console.error(`[VITE_PROXY_ROUTER] ERROR: Request does not seem to contain a valid URL: ${requestUrl}`);
                return 'http://localhost:9999'; // Return a dummy target to avoid crash
              }
              const targetUrlStr = requestUrl.substring('/proxy/'.length);
              try {
                const targetUrl = new URL(targetUrlStr);
                console.log(`[VITE_PROXY_ROUTER] Routing to: ${targetUrl.origin}`);
                return targetUrl.origin;
              } catch (e) {
                console.error(`[VITE_PROXY_ROUTER] ERROR: Failed to parse URL '${targetUrlStr}'.`, e);
                return 'http://localhost:9999'; // Return a dummy target to avoid crash
              }
            },
            rewrite: (path) => {
              console.log(`[VITE_PROXY_REWRITE] Original path: ${path}`);
              if (!path.startsWith('/proxy/http')) {
                 console.error(`[VITE_PROXY_REWRITE] ERROR: Path does not seem to contain a valid URL: ${path}`);
                 return '/'; // Return a safe path
              }
              const targetUrlStr = path.substring('/proxy/'.length);
              try {
                const targetUrl = new URL(targetUrlStr);
                const newPath = targetUrl.pathname + targetUrl.search;
                console.log(`[VITE_PROXY_REWRITE] Rewritten path: ${newPath}`);
                return newPath;
              } catch (e) {
                console.error(`[VITE_PROXY_REWRITE] ERROR: Failed to parse URL in path '${targetUrlStr}'.`, e);
                return '/'; // Return a safe path
              }
            },
          },
        },
      },
    };
});
