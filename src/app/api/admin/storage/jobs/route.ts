import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";
import { retryJob } from "@/lib/storage/queue";

/** Cola de aprovisionamiento: FAILED visibles al super-admin (research R6). */
export const GET = withApi(async () => {
  await requireSuperAdmin();
  const jobs = await prisma.provisioningJob.findMany({
    where: { status: { in: ["PENDING", "FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(jobs);
});

const retrySchema = z.object({ jobId: z.string().uuid() });

export const POST = withApi(async (req) => {
  await requireSuperAdmin();
  const { jobId } = retrySchema.parse(await req.json());
  await retryJob(jobId);
  return NextResponse.json({ ok: true });
});
