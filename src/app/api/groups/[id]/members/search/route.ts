import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canManageGroup } from "@/lib/domain/permissions";
import { searchUserCandidates } from "@/lib/domain/users/matching";

/** Búsqueda de candidatos para agregar como miembro (FR-001..FR-006): solo ADMIN del grupo. */
export const GET = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw notFound();

  const ctx = await getUserContext(session.user.id);
  if (!canManageGroup(ctx, id)) throw forbidden("Solo los administradores del grupo");

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json([]);

  const [candidates, memberships] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
    prisma.groupMembership.findMany({ where: { groupId: id }, select: { userId: true } }),
  ]);
  const existingMemberIds = new Set(memberships.map((m) => m.userId));

  const results = searchUserCandidates(candidates, q, existingMemberIds);
  return NextResponse.json(results);
});
