import app from './app.js';
import { env } from './config/env.js';
import prisma from './lib/prisma.js';

const server = app.listen(env.port, () => {
  console.log(`Server chạy tại http://localhost:${env.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
