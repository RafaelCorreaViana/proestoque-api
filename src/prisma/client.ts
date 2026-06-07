import { PrismaClient } from "@prisma/client";

// Singleton: garante que existe apenas um PrismaClient em toda a aplicação.
// Em desenvolvimento com hot-reload, o módulo pode ser recarregado várias vezes.
// Por isso, guardamos a instância na variável global do Node.js.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    // log: ["query"] → mostra cada SQL executado no console (ótimo para debug)
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
