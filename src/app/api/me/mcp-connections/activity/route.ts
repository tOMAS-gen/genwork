import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";

/**
 * Actividad administrativa (sin `workId`) originada vía MCP por el usuario
 * autenticado — el resto de la actividad (ligada a un proyecto) se ve en la
 * pestaña "Actividad" de cada proyecto (FR-010).
 */
export const GET = withApi(async () => {
  const session = await requireSession();
  const entries = await prisma.mcpActivityLog.findMany({
    where: { userId: session.user.id, workId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, toolName: true, summary: true, createdAt: true },
  });
  return NextResponse.json({ entries });
});
