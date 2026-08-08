import app from './app';
import env from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

async function startServer(): Promise<void> {
  try {
    // Validate environment
    console.log(`🚀 Starting ledgerHQ server in ${env.NODE_ENV} mode`);

    // Connect to database
    await connectDatabase();

    // Start server
    const server = app.listen(env.PORT, () => {
      console.log(`✅ Server running on http://localhost:${env.PORT}`);
      console.log(`📡 API: http://localhost:${env.PORT}/api/v1`);
      console.log(`🏥 Health: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n📛 Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after 10 seconds');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

startServer();
