import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { badRequest, withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { hashMcpToken } from "@/server/mcp-auth";

const createSchema = z.object({
  label: z.string().trim().min(1, "El label es obligatorio").max(100),
});

function generateToken(): string {
  return `genwork_mcp_${randomBytes(32).toString("base64url")}`;
}

export const GET = withApi(async () => {
  const session = await requireSession();
  const connections = await prisma.mcpConnection.findMany({
    where: { userId: session.user.id },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ connections });
});

export const POST = withApi(async (req) => {
  const session = await requireSession();
  const body = createSchema.safeParse(await req.json());
  if (!body.success) throw badRequest(body.error.issues[0]?.message ?? "Datos inválidos");

  const token = generateToken();
  const connection = await prisma.mcpConnection.create({
    data: {
      userId: session.user.id,
      label: body.data.label,
      tokenHash: hashMcpToken(token),
    },
    select: { id: true, label: true, createdAt: true },
  });

  // Única vez que el token en texto plano viaja al cliente (contracts/mcp-connections-api.md).
  return Response.json({ ...connection, token });
});
