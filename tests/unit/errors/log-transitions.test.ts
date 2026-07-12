import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { buildErrorLogUpsertArgs } from "@/lib/errors/log";

const now = new Date("2026-07-10T12:00:00.000Z");

describe("buildErrorLogUpsertArgs", () => {
  it("arma el where por fingerprint", () => {
    const args = buildErrorLogUpsertArgs({
      fingerprint: "abc123",
      message: "boom",
      stack: null,
      route: "POST /api/works",
      method: "POST",
      userId: null,
      data: undefined,
      now,
    });
    expect(args.where).toEqual({ fingerprint: "abc123" });
  });

  it("create: registro nuevo con status PENDING, occurrences 1, first/lastSeenAt = now — sin importar estado previo (no lo lee)", () => {
    const args = buildErrorLogUpsertArgs({
      fingerprint: "abc123",
      message: "boom",
      stack: "at foo (bar.ts:1:1)",
      route: "POST /api/works",
      method: "POST",
      userId: "user-1",
      data: { workId: "work-1" },
      now,
    });
    expect(args.create).toMatchObject({
      fingerprint: "abc123",
      message: "boom",
      stack: "at foo (bar.ts:1:1)",
      route: "POST /api/works",
      method: "POST",
      userId: "user-1",
      context: { workId: "work-1" },
      status: "PENDING",
      occurrences: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  });

  it("create: sin data asociada, context es Prisma.DbNull (no un objeto vacío)", () => {
    const args = buildErrorLogUpsertArgs({
      fingerprint: "abc123",
      message: "boom",
      stack: null,
      route: "POST /api/works",
      method: null,
      userId: null,
      data: undefined,
      now,
    });
    expect(args.create.context).toBe(Prisma.DbNull);
  });

  it("update: siempre incondicional — occurrences+1, lastSeenAt=now, status PENDING, resolvedAt null (sirve tanto para repetir sobre PENDING como para reabrir sobre RESOLVED, FR-011)", () => {
    const args = buildErrorLogUpsertArgs({
      fingerprint: "abc123",
      message: "boom",
      stack: null,
      route: "POST /api/works",
      method: "POST",
      userId: "user-2",
      data: undefined,
      now,
    });
    expect(args.update).toEqual({
      occurrences: { increment: 1 },
      lastSeenAt: now,
      status: "PENDING",
      resolvedAt: null,
      userId: "user-2",
    });
  });

  it("update: si no hay userId en la ocurrencia actual, no pisa el userId existente", () => {
    const args = buildErrorLogUpsertArgs({
      fingerprint: "abc123",
      message: "boom",
      stack: null,
      route: "POST /api/works",
      method: "POST",
      userId: null,
      data: undefined,
      now,
    });
    expect(args.update).not.toHaveProperty("userId");
  });
});
