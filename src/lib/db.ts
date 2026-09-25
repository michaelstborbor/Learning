import { PrismaClient } from "@prisma/client";

// Standard Next.js pattern: in development, hot-reload would otherwise create
// a new PrismaClient (and new DB connection pool) on every file change. We
// stash one instance on the global object and reuse it.
//
// The client is instantiated lazily (on first property access) rather than
// eagerly at module load. This is good practice regardless of environment —
// it means importing this module never has a side effect — and it also
// avoids constructing PrismaClient during Next.js's build-time route
// analysis, when no real request is being served yet.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});
