import { prisma } from "./prisma";

export type AuditInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? undefined) as never,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] No se pudo registrar la acción", error);
  }
}
