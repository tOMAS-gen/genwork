import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/client";
import { isEmailAllowed, normalizeEmail } from "@/lib/domain/access";
import { enqueue } from "@/lib/storage/queue";
import type { GlobalRole } from "@prisma/client";

/**
 * Modo de prueba local (DEV_AUTH=true): usuarios de test sin Google, para
 * validar la plataforma antes de producción. NUNCA activarlo en producción.
 */
export const DEV_AUTH_ENABLED = process.env.DEV_AUTH === "true";

export const DEV_USERS: Record<string, { email: string; name: string; role: GlobalRole }> = {
  admin: { email: "admin@test.local", name: "Admin de prueba", role: "SUPERADMIN" },
  miembro: { email: "miembro@test.local", name: "Miembro de prueba", role: "MEMBER" },
  lector: { email: "lector@test.local", name: "Lector de prueba (TV)", role: "READER" },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      globalRole: GlobalRole;
    };
  }
}

/**
 * Ingreso solo con Google (FR-017). El callback signIn valida el correo contra la
 * configuración de acceso (FR-019); el primer usuario del sistema queda como
 * SUPERADMIN (bootstrap) y todo usuario autorizado se aprovisiona en la mini nube
 * (FR-033, vía cola).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    ...(DEV_AUTH_ENABLED
      ? [
          Credentials({
            id: "dev",
            name: "Usuario de prueba",
            credentials: { user: { label: "Usuario", type: "text" } },
            async authorize(credentials) {
              const key = String(credentials?.user ?? "");
              const dev = DEV_USERS[key];
              if (!dev) return null;
              const user = await prisma.user.upsert({
                where: { email: dev.email },
                create: { email: dev.email, name: dev.name, globalRole: dev.role },
                update: { globalRole: dev.role },
              });
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      // Usuarios de prueba (modo dev): ya creados en authorize, sin allowlist
      if (account?.provider === "dev") return DEV_AUTH_ENABLED;

      const email = normalizeEmail(user.email ?? "");
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return true;

      const userCount = await prisma.user.count();
      const isBootstrap = userCount === 0;

      if (!isBootstrap) {
        const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
        const allowed = await prisma.allowedEmail.findMany();
        const ok = isEmailAllowed(
          {
            mode: config?.mode ?? "LIST",
            domain: config?.domain ?? null,
            allowedEmails: new Set(allowed.map((a) => normalizeEmail(a.email))),
          },
          email,
        );
        if (!ok) return "/login?error=AccessDenied";
      }

      const created = await prisma.user.create({
        data: {
          email,
          name: user.name ?? email,
          globalRole: isBootstrap ? "SUPERADMIN" : "MEMBER",
        },
      });
      if (isBootstrap) {
        await prisma.accessConfig.upsert({
          where: { id: 1 },
          create: { id: 1, mode: "LIST" },
          update: {},
        });
        await prisma.allowedEmail.upsert({
          where: { email },
          create: { email },
          update: {},
        });
      }
      await enqueue({
        kind: "CREATE_USER",
        userId: created.id,
        email,
        displayName: created.name,
      });
      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: normalizeEmail(user.email) },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.globalRole = dbUser.globalRole;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.globalRole = token.globalRole as GlobalRole;
      }
      return session;
    },
  },
});

/** Sesión requerida en route handlers; lanza 401 si no hay. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw Object.assign(new Error("No autenticado"), { status: 401 });
  }
  return session;
}
