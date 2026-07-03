import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";
import { normalizeEmail } from "@/lib/domain/access";

export const GET = withApi(async () => {
  await requireSuperAdmin();
  const emails = await prisma.allowedEmail.findMany({ orderBy: { email: "asc" } });
  return NextResponse.json(emails.map((e) => e.email));
});

const emailSchema = z.object({ email: z.string().email("Correo inválido") });

export const POST = withApi(async (req) => {
  await requireSuperAdmin();
  const { email } = emailSchema.parse(await req.json());
  const normalized = normalizeEmail(email);
  await prisma.allowedEmail.upsert({
    where: { email: normalized },
    create: { email: normalized },
    update: {},
  });
  return NextResponse.json({ email: normalized }, { status: 201 });
});

/** Quitar un correo revoca el próximo ingreso (edge case spec). */
export const DELETE = withApi(async (req) => {
  await requireSuperAdmin();
  const { email } = emailSchema.parse(await req.json());
  await prisma.allowedEmail.deleteMany({ where: { email: normalizeEmail(email) } });
  return new NextResponse(null, { status: 204 });
});
