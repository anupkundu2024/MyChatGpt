import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB, redactCredentials } from './config/db.js';
import { migrateConversationModels } from './services/conversation.service.js';

async function start() {
  await connectDB();
  await migrateConversationModels();

  const server = app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error(`Failed to start server: ${redactCredentials(err.message)}`);
  if (err.cause) console.error(`  cause: ${redactCredentials(String(err.cause.message ?? err.cause))}`);
  process.exit(1);
});
