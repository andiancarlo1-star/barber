import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma, PrismaClient } from "@prisma/client";

export type RlsRole = "SYSTEM" | "ADMIN" | "BARBER" | "CUSTOMER" | "ANON";

export type RlsContext = {
  role: RlsRole;
  userId?: string | null;
  customerId?: string | null;
  barberId?: string | null;
};

const contextStorage = new AsyncLocalStorage<RlsContext>();
const transactionStorage = new AsyncLocalStorage<Prisma.TransactionClient>();

export function setRlsContext(context: RlsContext): void {
  contextStorage.enterWith(context);
}

export function withRlsContext<T>(context: RlsContext, callback: () => T): T {
  return contextStorage.run(context, callback);
}

export function getRlsContext(): RlsContext {
  return contextStorage.getStore() ?? { role: "ANON" };
}

async function applyContext(tx: Prisma.TransactionClient, context: RlsContext): Promise<void> {
  await tx.$executeRaw`select set_config('app.user_role', ${context.role}, true)`;
  await tx.$executeRaw`select set_config('app.user_id', ${context.userId ?? ""}, true)`;
  await tx.$executeRaw`select set_config('app.customer_id', ${context.customerId ?? ""}, true)`;
  await tx.$executeRaw`select set_config('app.barber_id', ${context.barberId ?? ""}, true)`;
}

function isModelDelegate(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { findMany?: unknown }).findMany === "function"
  );
}

export function createRlsClient(base: PrismaClient): PrismaClient {
  const modelProxies = new Map<PropertyKey, unknown>();

  const proxy = new Proxy(base, {
    get(target, property, receiver) {
      if (property === "$transaction") {
        return async (argument: unknown, options?: unknown) => {
          const currentTransaction = transactionStorage.getStore();

          if (currentTransaction) {
            if (typeof argument === "function") {
              return (argument as (tx: Prisma.TransactionClient) => Promise<unknown>)(currentTransaction);
            }
            return Promise.all(argument as Promise<unknown>[]);
          }

          if (typeof argument !== "function") {
            return Promise.all(argument as Promise<unknown>[]);
          }

          return target.$transaction(async (tx) => {
            await applyContext(tx, getRlsContext());
            return transactionStorage.run(tx, () =>
              (argument as (tx: Prisma.TransactionClient) => Promise<unknown>)(tx),
            );
          }, options as never);
        };
      }

      if (
        property === "$queryRaw" ||
        property === "$queryRawUnsafe" ||
        property === "$executeRaw" ||
        property === "$executeRawUnsafe"
      ) {
        return async (...args: unknown[]) => {
          const currentTransaction = transactionStorage.getStore();
          if (currentTransaction) {
            return (currentTransaction[property] as (...input: unknown[]) => Promise<unknown>)(...args);
          }
          return target.$transaction(async (tx) => {
            await applyContext(tx, getRlsContext());
            return (tx[property] as (...input: unknown[]) => Promise<unknown>)(...args);
          });
        };
      }

      if (
        property === "$connect" ||
        property === "$disconnect" ||
        property === "$on" ||
        property === "$extends"
      ) {
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      }

      const currentTransaction = transactionStorage.getStore();
      if (currentTransaction) {
        return Reflect.get(currentTransaction, property);
      }

      const value = Reflect.get(target, property, receiver);
      if (!isModelDelegate(value)) {
        return typeof value === "function" ? value.bind(target) : value;
      }

      if (!modelProxies.has(property)) {
        modelProxies.set(
          property,
          new Proxy(value, {
            get(modelTarget, method) {
              const delegateMethod = Reflect.get(modelTarget, method, modelTarget);
              if (typeof delegateMethod !== "function") return delegateMethod;

              return async (...args: unknown[]) => {
                const existingTransaction = transactionStorage.getStore();
                if (existingTransaction) {
                  const txModel = (
                    existingTransaction as unknown as Record<
                      PropertyKey,
                      Record<string, (...input: unknown[]) => Promise<unknown>>
                    >
                  )[property];
                  return txModel[method as string](...args);
                }
                return target.$transaction(async (tx) => {
                  await applyContext(tx, getRlsContext());
                  const txModel = (
                    tx as unknown as Record<
                      PropertyKey,
                      Record<string, (...input: unknown[]) => Promise<unknown>>
                    >
                  )[property];
                  return txModel[method as string](...args);
                });
              };
            },
          }),
        );
      }

      return modelProxies.get(property);
    },
  });

  return proxy;
}
