import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      phone?: string | null;
      barberId?: string | null;
      customerId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    phone?: string | null;
    barberId?: string | null;
    customerId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    phone?: string | null;
    barberId?: string | null;
    customerId?: string | null;
  }
}
