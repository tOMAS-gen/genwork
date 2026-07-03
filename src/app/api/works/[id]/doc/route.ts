import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { forbidden, notFound, withApi } from "@/server/api";
import { requireWriter } from "@/server/guards";
import { getUserContext } from "@/server/user-context";
import { access } from "@/lib/domain/permissions";
import { emit } from "@/server/events";

const schema = z.object({ content: z.unknown() });

/** Documentación del trabajo: JSON de ProseMirror (research R3). */
export const PUT = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const session = await requireWriter();
  const { id } = await params;

  const work = await prisma.work.findUnique({
    where: { id },
    include: { group: { select: { publicRead: true } } },
  });
  if (!work) throw notFound();

  const ctx = await getUserContext(session.user.id);
  const level = access(ctx, {
    groupId: work.groupId,
    ownerId: work.ownerId,
    groupPublicRead: work.group?.publicRead ?? false,
  });
  if (level === "none") throw notFound();
  if (level !== "operate") throw forbidden();

  const { content } = schema.parse(await req.json());
  const doc = await prisma.docPage.upsert({
    where: { workId: id },
    create: { workId: id, content: content as object },
    update: { content: content as object },
  });
  emit({ type: "work-changed", workId: id });
  return NextResponse.json(doc);
});
