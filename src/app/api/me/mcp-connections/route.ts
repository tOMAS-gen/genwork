import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, conflict, withApi } from "@/server/api";
import { requireInternal } from "@/server/guards";
import { MAX_ACTIVE_MCP_CONNECTIONS, hashMcpToken } from "@/server/mcp-auth";

const createSchema = z.object({
  label: z.string().trim().max(100).optional(),
});

function generateToken(): string {
  return `genwork_mcp_${randomBytes(32).toString("base64url")}`;
}

export const GET = withApi(async () => {
  const session = await requireInternal();
  const connections = await prisma.mcpConnection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      label: true,
      tokenLast4: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ connections, maxActive: MAX_ACTIVE_MCP_CONNECTIONS });
});

export const POST = withApi(async (req) => {
  const session = await requireInternal();
  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) throw badRequest(body.error.issues[0]?.message ?? "Datos inválidos");

  const active = await prisma.mcpConnection.count({
    where: { userId: session.user.id, revokedAt: null },
  });
  if (active >= MAX_ACTIVE_MCP_CONNECTIONS) {
    throw conflict(
      `Llegaste al máximo de ${MAX_ACTIVE_MCP_CONNECTIONS} tokens activos. Revocá uno para generar otro.`,
    );
  }

  const token = generateToken();
  const connection = await prisma.mcpConnection.create({
    data: {
      userId: session.user.id,
      label: body.data.label || "Claude",
      tokenHash: hashMcpToken(token),
      tokenLast4: token.slice(-4),
    },
    select: { id: true, label: true, tokenLast4: true, createdAt: true },
  });

  // Única vez que el token en texto plano viaja al cliente (contracts/mcp-connections-api.md).
  return Response.json({ ...connection, token });
});
