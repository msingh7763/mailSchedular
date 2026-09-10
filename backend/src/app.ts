import express from 'express';
import cors from 'cors';
import basicAuth from 'express-basic-auth';
import { config } from './config';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';
import { createBullBoardRouter } from './queues/bullBoard';

export function createApp() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Bull Board dashboard (basic auth protected)
  app.use(
    '/admin/queues',
    basicAuth({
      users: { [config.bullBoard.user]: config.bullBoard.password },
      challenge: true,
      realm: 'ReachInbox Queue Dashboard',
    }),
    createBullBoardRouter()
  );

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/slack', slackRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[App] Unhandled error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}
