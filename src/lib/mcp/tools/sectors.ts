import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { notFound } from "@/server/api";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";
import {
  getVisibleSector,
  listVisibleSectors,
  type SectorScope,
  type VisibleSector,
} from "@/server/sectors";

/** Etiqueta legible del ámbito: lo primero que necesita el asistente para ubicarse. */
export function scopeLabel(scope: SectorScope): string {
  if (scope.type === "GROUP") return `Grupo ${scope.groupName ?? scope.groupId}`;
  if (scope.type === "PERSONAL") return scope.ownerName ? `Personal de ${scope.ownerName}` : "Personal";
  return "Global";
}

/** Clave de agrupación estable por ámbito (mismo criterio que la UI de feature 060). */
function scopeKey(scope: SectorScope): string {
  if (scope.type === "GROUP") return `GROUP:${scope.groupId}`;
  if (scope.type === "PERSONAL") return `PERSONAL:${scope.ownerId}`;
  return "GLOBAL";
}

function summarizeSector(sector: VisibleSector) {
  return {
    id: sector.id,
    name: sector.name,
    color: sector.color,
    scope: sector.scope,
    scopeLabel: scopeLabel(sector.scope),
    groupId: sector.groupId,
    groupName: sector.group?.name ?? null,
    ownerId: sector.ownerId,
    access: sector.access,
    metrics: sector.metrics,
  };
}

/** Agrupa los sectores por ámbito para que el asistente vea "qué hay en cada grupo". */
function groupByScope(sectors: VisibleSector[]) {
  const buckets = new Map<
    string,
    { scope: SectorScope; label: string; sectors: { id: string; name: string; pending: number }[] }
  >();

  for (const sector of sectors) {
    const key = scopeKey(sector.scope);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { scope: sector.scope, label: scopeLabel(sector.scope), sectors: [] };
      buckets.set(key, bucket);
    }
    bucket.sectors.push({ id: sector.id, name: sector.name, pending: sector.metrics.pending });
  }

  return [...buckets.values()];
}

export function registerSectorTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "sector.list",
    {
      title: "Listar sectores",
      description:
        "Lista los sectores visibles para el usuario indicando a qué ámbito pertenece cada uno " +
        "(Grupo con su nombre, Personal o Global), su color, el nivel de acceso del usuario y los " +
        "contadores de tareas. Filtros opcionales por tipo de ámbito o por grupo.",
      inputSchema: {
        scope: z.enum(["GROUP", "PERSONAL", "GLOBAL"]).optional(),
        groupId: z.string().uuid().optional(),
      },
    },
    async ({ scope, groupId }) => {
      try {
        let sectors = await listVisibleSectors(ctx.userContext);
        if (scope) sectors = sectors.filter((s) => s.scope.type === scope);
        if (groupId) sectors = sectors.filter((s) => s.groupId === groupId);

        const byScope = groupByScope(sectors);
        const text =
          sectors.length === 0
            ? "0 sector(es) visibles."
            : `${sectors.length} sector(es) visibles. ` +
              byScope
                .map((b) => `${b.label}: ${b.sectors.map((s) => s.name).join(", ")}`)
                .join(" | ");

        return toolSuccess(text, {
          sectors: sectors.map(summarizeSector),
          byScope,
        });
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );

  server.registerTool(
    "sector.get",
    {
      title: "Ver sector",
      description:
        "Detalle de un sector: nombre, color, ámbito (grupo/personal/global), nivel de acceso del " +
        "usuario y contadores de tareas (total, pendientes, finalizadas).",
      inputSchema: { sectorId: z.string().uuid() },
    },
    async ({ sectorId }) => {
      try {
        const sector = await getVisibleSector(ctx.userContext, sectorId);
        // Mismo criterio que la web: no se distingue "no existe" de "no lo ves".
        if (!sector) throw notFound("Sector no encontrado");

        const summary = summarizeSector(sector);
        return toolSuccess(
          `Sector "${sector.name}" (${summary.scopeLabel}) — ${sector.metrics.pending} pendiente(s) de ${sector.metrics.total} tarea(s).`,
          summary,
        );
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
