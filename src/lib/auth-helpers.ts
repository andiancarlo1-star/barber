import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "../../auth";
import { prisma } from "./prisma";
import { setRlsContext, withRlsContext } from "./rls";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  barberId: string | null;
  customerId: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    setRlsContext({ role: "ANON" });
    return null;
  }

  // JWT role/profile claims can become stale after an account is disabled or
  // its role changes. Re-read the identity from PostgreSQL before trusting it.
  const record = await withRlsContext({ role: "SYSTEM" }, () =>
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        active: true,
        barberProfile: { select: { id: true } },
        customerProfile: { select: { id: true } },
      },
    }),
  );

  if (!record?.active) {
    setRlsContext({ role: "ANON" });
    return null;
  }

  const user: SessionUser = {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    phone: record.phone,
    barberId: record.barberProfile?.id ?? null,
    customerId: record.customerProfile?.id ?? null,
  };
  setRlsContext({
    role: user.role,
    userId: user.id,
    customerId: user.customerId,
    barberId: user.barberId,
  });
  return user;
}

export async function requireUser(callbackUrl = "/"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/ingresar?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

export async function requireRole(roles: Role[], callbackUrl = "/"): Promise<SessionUser> {
  const user = await requireUser(callbackUrl);
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export async function requireBarber(): Promise<{ user: SessionUser; barberId: string }> {
  const user = await requireRole(["BARBER", "ADMIN"], "/barbero");
  if (user.role === "BARBER" && user.barberId) {
    return { user, barberId: user.barberId };
  }
  if (user.role === "ADMIN") {
    const barber = await prisma.barber.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (barber) return { user, barberId: barber.id };
    redirect("/admin");
  }
  redirect("/");
}

export async function apiUser(roles?: Role[]): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}
