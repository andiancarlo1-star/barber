import { PrismaClient } from "@prisma/client";
import { createRlsClient } from "./rls";

const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };

const base =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaBase = base;

export const prisma = createRlsClient(base);
