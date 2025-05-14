import { PrismaClient } from '@prisma/client';

// Use a singleton pattern to prevent multiple instances in development
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable to avoid multiple connections
  const globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };
  
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  
  prisma = globalWithPrisma.prisma;
}

export { prisma };