import express from 'express';
import path from 'path';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './backend/app/api/routes.js';
import { wsManager } from './backend/app/websocket/ws_server.js';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Mount API router first
  app.use('/api', apiRouter);

  // Initialize WebSockets attached to the HTTP server
  wsManager.init(server);

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'TRINETRA' });
  });

  // Vite middleware in development vs static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[TRINETRA] Command Center active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TRINETRA] Failed to start server:', err);
  process.exit(1);
});
