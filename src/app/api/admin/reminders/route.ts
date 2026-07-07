import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";

/** Config de recordatorios a nivel sistema (zona horaria + email). Solo SUPERADMIN. */

export const GET = withApi(async () => {
  await requireSuperAdmin();
  const config = await prisma.accessConfig.findUnique({ where: { id: 1 } });
  const email = (config?.reminderEmailConfig as { provider?: string; gmail?: { refreshToken?: string; fromEmail?: string } } | null) ?? null;
  return NextResponse.json({
    timezone: config?.timezone ?? "America/Argentina/Buenos_Aires",
    emailProvider: email?.provider ?? null,
    emailConnected: Boolean(email?.gmail?.refreshToken),
    emailFrom: email?.gmail?.fromEmail ?? null,
  });
});

const patchSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  disconnectEmail: z.boolean().optional(),
});

export const PATCH = withApi(async (req) => {
  await requireSuperAdmin();
  const body = patchSchema.parse(await req.json());

  const current = await prisma.accessConfig.findUnique({ where: { id: 1 } });

  const data: { timezone?: string; reminderEmailConfig?: typeof Prisma.JsonNull } = {};
  if (body.timezone) {
    // Validar que sea una zona IANA reconocida por Intl.
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: body.timezone });
      data.timezone = body.timezone;
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Zona horaria inválida" } },
        { status: 400 },
      );
    }
  }
  if (body.disconnectEmail) data.reminderEmailConfig = Prisma.JsonNull;

  await prisma.accessConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true });
});
