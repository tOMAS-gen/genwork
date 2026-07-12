import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";

/** Detalle completo de un error registrado (FR-005). */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  await requireSuperAdmin();
  const { id } = await params;

  const error = await prisma.errorLog.findUnique({ where: { id } });
  if (!error) throw notFound();

  return NextResponse.json(error);
});

const patchSchema = z.object({
  status: z.enum(["PENDING", "RESOLVED"]),
});

/** Marca un error como resuelto o lo reabre manualmente (FR-006, edge case "revertir por error"). */
export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireSuperAdmin();
  const { id } = await params;
  const { status } = patchSchema.parse(await req.json());

  const existing = await prisma.errorLog.findUnique({ where: { id } });
  if (!existing) throw notFound();

  const error = await prisma.errorLog.update({
    where: { id },
    data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
  });
  return NextResponse.json(error);
});
