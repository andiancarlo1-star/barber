import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { clientIp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`register:${ip}`, 5, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, phone, passwordHash, role: "CUSTOMER" },
    });
    await tx.customer.upsert({
      where: { email },
      update: { userId: created.id, name, phone },
      create: { userId: created.id, name, email, phone },
    });
    return created;
  });

  await logAudit({
    userId: user.id,
    action: "USER_REGISTERED",
    entity: "User",
    entityId: user.id,
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}
