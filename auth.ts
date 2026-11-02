import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRlsContext } from "@/lib/rls";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";
const useSecureCookies = appUrl.startsWith("https://");

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/ingresar",
  },
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await withRlsContext({ role: "SYSTEM" }, () =>
          prisma.user.findUnique({
            where: { email: parsed.data.email.toLowerCase().trim() },
            include: { barberProfile: true, customerProfile: true },
          }),
        );
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          phone: user.phone,
          barberId: user.barberProfile?.id ?? null,
          customerId: user.customerProfile?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.phone = user.phone;
        token.barberId = user.barberId ?? null;
        token.customerId = user.customerId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? token.sub ?? "";
        session.user.role = (token.role as "ADMIN" | "BARBER" | "CUSTOMER") ?? "CUSTOMER";
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.barberId = (token.barberId as string | null) ?? null;
        session.user.customerId = (token.customerId as string | null) ?? null;
      }
      return session;
    },
  },
});
