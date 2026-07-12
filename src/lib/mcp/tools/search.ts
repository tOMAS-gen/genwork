import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { access, accessSector, taskAccess } from "@/lib/domain/permissions";
import { toTaskRef } from "@/server/tasks";
import type { McpAuth } from "@/server/mcp-auth";
import { toolSuccess, toToolErrorResult } from "@/lib/mcp/errors";

const LIMIT = 20;

export function registerSearchTools(server: McpServer, ctx: McpAuth): void {
  server.registerTool(
    "search.query",
    {
      title: "Buscar",
      description: "Busca proyectos, tareas y/o sectores por texto, ya filtrado por lo que el usuario puede ver.",
      inputSchema: {
        text: z.string().trim().min(1),
        kinds: z.array(z.enum(["work", "task", "sector"])).optional(),
      },
    },
    async ({ text, kinds }) => {
      try {
        const wanted = new Set(kinds && kinds.length > 0 ? kinds : ["work", "task", "sector"]);
        const result: {
          works: { id: string; name: string }[];
          tasks: { id: string; text: string; workId: string | null }[];
          sectors: { id: string; name: string }[];
        } = { works: [], tasks: [], sectors: [] };

        if (wanted.has("work")) {
          const works = await prisma.work.findMany({
            where: { status: "ACTIVE", isTemplate: false, name: { contains: text, mode: "insensitive" } },
            include: { group: { select: { publicRead: true } } },
            take: LIMIT * 3,
          });
          result.works = works
            .filter(
              (w) =>
                access(ctx.userContext, {
                  groupId: w.groupId,
                  ownerId: w.ownerId,
                  groupPublicRead: w.group?.publicRead ?? false,
                }) !== "none",
            )
            .slice(0, LIMIT)
            .map((w) => ({ id: w.id, name: w.name }));
        }

        if (wanted.has("sector")) {
          const sectors = await prisma.sector.findMany({
            where: { name: { contains: text, mode: "insensitive" } },
            include: { group: { select: { publicRead: true } } },
            take: LIMIT * 3,
          });
          result.sectors = sectors
            .filter(
              (s) =>
                accessSector(ctx.userContext, {
                  id: s.id,
                  groupId: s.groupId,
                  ownerId: s.ownerId,
                  groupPublicRead: s.group?.publicRead ?? false,
                }) !== "none",
            )
            .slice(0, LIMIT)
            .map((s) => ({ id: s.id, name: s.name }));
        }

        if (wanted.has("task")) {
          const tasks = await prisma.task.findMany({
            where: { displayText: { contains: text, mode: "insensitive" } },
            include: {
              links: { include: { sector: true, user: { select: { id: true, name: true } } } },
              work: { select: { id: true, name: true } },
              homeSector: { select: { id: true, name: true } },
              status: true,
            },
            take: LIMIT * 3,
            orderBy: { createdAt: "desc" },
          });
          const visible: typeof tasks = [];
          for (const t of tasks) {
            if (visible.length >= LIMIT) break;
            const ref = await toTaskRef(t);
            if (taskAccess(ctx.userContext, ref) !== "none") visible.push(t);
          }
          result.tasks = visible.map((t) => ({ id: t.id, text: t.displayText, workId: t.workId }));
        }

        const total = result.works.length + result.tasks.length + result.sectors.length;
        return toolSuccess(`${total} resultado(s) para "${text}".`, result);
      } catch (err) {
        return toToolErrorResult(err);
      }
    },
  );
}
