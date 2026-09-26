import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'hackathon-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/dispatch' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  const apiKey = env.HACKATHON_API_KEY || process.env.HACKATHON_API_KEY;
                  const apiUrl = env.HACKATHON_API_URL || 'https://hackathon-api-new-152590733511.northamerica-northeast2.run.app/api/generate';

                  if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing HACKATHON_API_KEY in server environment' }));
                    return;
                  }

                  const apiResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'X-API-Key': apiKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      contents: payload.contents || '',
                      model: payload.model || 'gemini-3-flash-preview',
                      ...(payload.response_schema ? { response_schema: payload.response_schema } : {})
                    }),
                  });

                  const data = await apiResponse.json();
                  res.statusCode = apiResponse.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    server: {
      port: 5173,
      host: true
    }
  };
});
