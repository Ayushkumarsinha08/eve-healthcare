import 'dotenv/config';
import app from './app';
import { prisma } from './utils/prisma';
import { getJwtSecret } from './utils/jwt';

const port = Number(process.env.PORT) || 3000;
getJwtSecret();
const server = app.listen(port, () => console.log(`EVE Healthcare API listening on port ${port}`));

const shutdown = (signal: string): void => {
  console.log(`${signal} received; shutting down`);
  server.close(() => { void prisma.$disconnect().finally(() => process.exit(0)); });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));