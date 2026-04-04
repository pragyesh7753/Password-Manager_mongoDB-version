import app from './src/app.js';
import { PORT, NODE_ENV } from './src/config/env.js';
import { connectToDatabase, closeDatabase } from './src/db/mongo.js';

let httpServer;

const shutdown = (signal) => {
  console.log(`${signal} received. Starting graceful shutdown...`);

  if (!httpServer) {
    process.exit(0);
  }

  httpServer.close(async () => {
    try {
      await closeDatabase();
      console.log('Shutdown complete.');
      process.exit(0);
    } catch (error) {
      console.error('Error while closing resources:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

const startServer = async () => {
  await connectToDatabase();

  httpServer = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (${NODE_ENV})`);
  });

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});