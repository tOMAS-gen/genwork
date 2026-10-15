import NextAuth, { type Session } from "next-auth";
import { headers } from "next/headers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/client";
import { canExistingUserSignIn, isEmailAllowed, normalizeEmail } from "@/lib/domain/access";
import { enqueue } from "@/lib/storage/queue";
import { extractMobileToken, userFromMobileToken } from "@/server/mobile-auth";
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
  // Feature 059: el portal de cliente es exclusivo del rol CLIENT (los internos no
  // entran), así que verificarlo en local exige una cuenta de cliente real.
  cliente: { email: "cliente@test.local", name: "Cliente de prueba", role: "CLIENT" },
};

/**
 * Cada cuánto se revalida el rol contra la base desde el token (feature 059).
 * El callback jwt solo consultaba la base en el primer ingreso, así que un cambio
 * de rol no se propagaba hasta que expiraba el token (30 días).
 */
const ROLE_SYNC_INTERVAL_MS = 60_000;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      globalRole: GlobalRole;
      image?: string | null;
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
    async signIn({ user, account, profile }) {
      // Usuarios de prueba (modo dev): ya creados en authorize, sin allowlist
      if (account?.provider === "dev") return DEV_AUTH_ENABLED;

      const email = normalizeEmail(user.email ?? "");
      if (!email) return false;

      const image = (profile as Record<string, unknown>)?.picture as string | undefined
        ?? (profile as Record<string, unknown>)?.image as string | undefined
        ?? null;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
        const allowed = await prisma.allowedEmail.findMany();
        const stillAllowed = canExistingUserSignIn(
          {
            mode: config?.mode ?? "LIST",
            domain: config?.domain ?? null,
            allowedEmails: new Set(allowed.map((a) => normalizeEmail(a.email))),
          },
          existing,
        );
        if (!stillAllowed) return "/login?error=AccessDenied";

        // Feature 059: se marca el primer ingreso efectivo para distinguir un
        // cliente invitado que todavía no entró de uno activo (FR-012). Solo la
        // primera vez: después el valor no se toca.
        await prisma.user.update({
          where: { email },
          data: { image, ...(existing.firstLoginAt ? {} : { firstLoginAt: new Date() }) },
        });
        return true;
      }

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
          image,
          firstLoginAt: new Date(),
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
          token.image = dbUser.image ?? null;
          token.roleSyncedAt = Date.now();
        }
        return token;
      }

      // Feature 059: sin esto el rol queda congelado en el token durante toda su
      // vida (30 días) y un cambio de rol no surte efecto nunca. Una consulta por
      // clave primaria como mucho una vez por minuto y por sesión activa.
      const syncedAt = typeof token.roleSyncedAt === "number" ? token.roleSyncedAt : 0;
      if (token.userId && Date.now() - syncedAt > ROLE_SYNC_INTERVAL_MS) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { globalRole: true, image: true },
        });
        // El usuario ya no existe (borrado, o base de dev recreada con una cookie
        // vieja todavía en el navegador): devolver null hace que Auth.js borre la
        // cookie de sesión y el usuario vuelva al login, en vez de que cada ruta
        // que arma el UserContext responda 500.
        if (!fresh) return null;
        token.globalRole = fresh.globalRole;
        token.image = fresh.image ?? null;
        token.roleSyncedAt = Date.now();
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.globalRole = token.globalRole as GlobalRole;
        session.user.image = (token.image as string) ?? null;
      }
      return session;
    },
  },
});

/**
 * Sesión de la app móvil (feature 064) a partir del header
 * `Authorization: Bearer genwork_mob_…`. Devuelve undefined si el request no trae
 * un token móvil (sigue el camino de la cookie) y null si lo trae pero no es
 * válido (no se cae a la cookie: un token inválido es un 401 explícito).
 */
async function mobileSession(): Promise<Session | null | undefined> {
  let authorization: string | null;
  try {
    authorization = (await headers()).get("authorization");
  } catch {
    return undefined; // fuera del contexto de un request
  }
  const token = extractMobileToken(authorization);
  if (!token) return undefined;
  const user = await userFromMobileToken(token);
  if (!user) return null;
  return { user, expires: new Date(Date.now() + 60_000).toISOString() };
}

/** Sesión requerida en route handlers (cookie web o token móvil); lanza 401 si no hay. */
export async function requireSession() {
  const mobile = await mobileSession();
  const session = mobile === undefined ? await auth() : mobile;
  if (!session?.user?.id) {
    throw Object.assign(new Error("No autenticado"), { status: 401 });
  }
  return session;
}
