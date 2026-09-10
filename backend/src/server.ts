import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { config } from './config';
import { prisma } from './lib/prisma';
import { setupElasticsearchIndex } from './lib/elasticsearch';
import { startEmailWorker } from './queues/emailWorker';

async function bootstrap(): Promise<void> {
  console.log('🚀 Starting ReachInbox Email Scheduler Backend...');

  // Connect to database
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  // Setup Elasticsearch index (non-blocking)
  setupElasticsearchIndex().catch((err) =>
    console.warn('⚠️  Elasticsearch setup failed (non-fatal):', err.message)
  );

  // Start BullMQ worker
  const worker = startEmailWorker();
  console.log('✅ BullMQ worker started');

  // Create and start Express app
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`✅ Server running at http://localhost:${config.port}`);
    console.log(`📊 Bull Board: http://localhost:${config.port}/admin/queues`);
    console.log(`   Username: ${config.bullBoard.user}`);
    console.log(`   Password: ${config.bullBoard.password}`);
    console.log('\n📧 Email Scheduler is ready!');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      await worker.close();
      await prisma.$disconnect();
      console.log('[Server] Shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30s
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
