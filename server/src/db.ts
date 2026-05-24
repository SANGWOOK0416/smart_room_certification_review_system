import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function warmupDatabase() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
}
