import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import copilotHandler from './api/copilot.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-copilot-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/copilot')) {
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.statusCode = 200;
              res.end();
              return;
            }
            if (req.method === 'POST') {
              let raw = '';
              req.on('data', chunk => { raw += chunk; });
              req.on('end', async () => {
                try {
                  req.body = raw ? JSON.parse(raw) : {};
                } catch {
                  req.body = {};
                }
                const mockRes = {
                  setHeader: (k, v) => res.setHeader(k, v),
                  status: (code) => {
                    res.statusCode = code;
                    return mockRes;
                  },
                  json: (data) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  end: () => res.end()
                };
                try {
                  await copilotHandler(req, mockRes);
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ fallback: true, error: err.message }));
                }
              });
              return;
            }
          }
          next();
        });
      }
    }
  ]
});
