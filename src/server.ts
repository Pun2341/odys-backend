import { buildServer } from './app.js';
import { env } from './env.js';

const app = await buildServer();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Odys API listening on http://localhost:${env.PORT}/v1`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();
    process.exit(0);
  });
}
