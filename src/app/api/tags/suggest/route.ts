import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { canAddress } from "@/lib/domain/permissions";
import { canonical, toTagForm } from "@/lib/domain/tags/matching";
import { scopeOf } from "@/server/tasks";

/**
 * Autocompletado de etiquetas (FR-009): matching tolerante case/acento-insensible y
 * espacio ≡ guion (canonical, ver matching.ts). El candidato matchea si su nombre canónico
 * empieza con la forma canónica del query (prefijo). Cada sugerencia incluye `insertText`
 * (toTagForm) para que la UI inserte una etiqueta parseable.
 * `/` incluye trabajos direccionables (canAddress, FR-038) aunque no se puedan abrir;
 * `@` sugiere sectores Y usuarios del ámbito (FR-041).
 */
export const GET = withApi(async (req) => {
  const session = await requireWriter();
  const ctx = await getUserContext(session.user.id);
  const url = new URL(req.url);

  const symbol = url.searchParams.get("symbol");
  const q = canonical(url.searchParams.get("q") ?? "");
  const contextWorkId = url.searchParams.get("contextWorkId");
  const contextSectorId = url.searchParams.get("contextSectorId");

  // Ámbito del contexto donde se escribe
  let scopeWhere: { groupId: string } | { ownerId: string };
  if (contextWorkId) {
    const work = await prisma.work.findUnique({ where: { id: contextWorkId } });
    if (!work) throw notFound();
    scopeWhere = work.groupId ? { groupId: work.groupId } : { ownerId: work.ownerId ?? ctx.id };
  } else if (contextSectorId) {
    const sector = await prisma.sector.findUnique({ where: { id: contextSectorId } });
    if (!sector) throw notFound();
    scopeWhere = sector.groupId
      ? { groupId: sector.groupId }
      : { ownerId: sector.ownerId ?? ctx.id };
  } else {
    scopeWhere = { ownerId: ctx.id };
  }

  const matches = (name: string) => canonical(name).startsWith(q);
  let results: {
    id: string;
    name: string;
    type: "work" | "sector" | "user" | "label";
    keyName?: string;
    color?: string;
    insertText: string;
  }[] = [];

  if (symbol === "/") {
    const works = await prisma.work.findMany({ where: { ...scopeWhere, status: "ACTIVE" } });
    results = works
      .filter((w) => matches(w.name) && canAddress(ctx, scopeOf(w)))
      .map((w) => ({ id: w.id, name: w.name, type: "work" as const, insertText: toTagForm(w.name) }));
  } else if (symbol === "#" || symbol === "@") {
    const sectors = await prisma.sector.findMany({ where: scopeWhere });
    results = sectors
      .filter((s) => matches(s.name))
      .map((s) => ({
        id: s.id,
        name: s.name,
        type: "sector" as const,
        insertText: toTagForm(s.name),
      }));

    if (symbol === "@") {
      // Usuarios del ámbito: miembros del grupo, o solo el dueño en espacio personal
      const users =
        "groupId" in scopeWhere
          ? (
              await prisma.groupMembership.findMany({
                where: { groupId: scopeWhere.groupId },
                include: { user: { select: { id: true, name: true, email: true } } },
              })
            ).map((m) => m.user)
          : await prisma.user.findMany({
              where: { id: ctx.id },
              select: { id: true, name: true, email: true },
            });
      results.push(
        ...users
          .filter((u) => matches(u.name) || matches(u.email.split("@")[0]))
          .map((u) => ({
            id: u.id,
            name: u.name,
            type: "user" as const,
            insertText: toTagForm(u.name),
          })),
      );
    }
  } else if (symbol === "$") {
    // Etiquetas disponibles del ámbito (FR-009): globales + las del grupo del work/sector
    // de contexto (R3/R4 de specs/032). Sin grupo (espacio personal), solo globales.
    const keys = await prisma.labelKey.findMany({
      where: {
        OR: [
          { groupId: null, ownerId: null },
          ...("groupId" in scopeWhere ? [{ groupId: scopeWhere.groupId, ownerId: null }] : []),
        ],
      },
      include: { values: true },
    });

    results = keys
      .flatMap((k) => k.values.map((v) => ({ key: k, value: v })))
      .filter(({ value }) => matches(value.name))
      .map(({ key, value }) => ({
        id: value.id,
        name: value.name,
        type: "label" as const,
        keyName: key.name,
        color: value.color,
        insertText: toTagForm(value.name),
      }));
  }

  return NextResponse.json(results.slice(0, 8));
});
