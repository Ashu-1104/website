import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Always cache the client on globalThis so that subsequent module evaluations
// within the same process (serverless warm starts, Next.js HMR in dev, etc.)
// reuse a single PrismaClient and its connection pool.
//
// NOTE: Each cold start / new isolate will still create its own client.
// For high-concurrency serverless deployments, also consider external connection
// pooling (PgBouncer, Prisma Accelerate, or provider-level pooling).
globalForPrisma.prisma = prisma;

