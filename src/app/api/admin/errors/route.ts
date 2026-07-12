import { NextResponse } from "next/server";
import { ErrorLogStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";

/** Listado de errores registrados, más recientes primero (FR-004). */
export const GET = withApi(async (req) => {
  await requireSuperAdmin();

  const status = new URL(req.url).searchParams.get("status");
  const where: Prisma.ErrorLogWhereInput | undefined =
    status && status in ErrorLogStatus ? { status: status as ErrorLogStatus } : undefined;

  const errors = await prisma.errorLog.findMany({
    where,
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      message: true,
      route: true,
      status: true,
      occurrences: true,
      firstSeenAt: true,
      lastSeenAt: true,
    },
  });
  return NextResponse.json(errors);
});
