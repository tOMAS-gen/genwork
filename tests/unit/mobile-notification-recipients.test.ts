import { describe, expect, it } from "vitest";
import { isTaskRecipient } from "@/server/notifications/recipients";
import type { TaskRef, UserContext } from "@/lib/domain/permissions";
const user = (patch: Partial<UserContext> = {}): UserContext => ({
  id: "u",
  globalRole: "MEMBER",
  memberGroupIds: new Set(),
  adminGroupIds: new Set(),
  grantedSectorIds: new Set(),
  readerGroupIds: new Set(),
  clientWorkIds: new Set(),
  ...patch,
});
const task = (patch: Partial<TaskRef> = {}): TaskRef => ({
  workScope: null,
  homeSector: null,
  execSectors: [],
  refSectors: [],
  refUserIds: new Set(),
  ...patch,
});
const sector = { id: "s", groupId: "g", ownerId: null, groupPublicRead: true };
describe("task notification audience", () => {
  it("includes direct mentions, even without project membership", () =>
    expect(isTaskRecipient(user(), task({ refUserIds: new Set(["u"]) }))).toBe(true));
  it("includes operators of referenced and executing sectors", () => {
    for (const key of ["refSectors", "execSectors"])
      expect(
        isTaskRecipient(user({ grantedSectorIds: new Set(["s"]) }), task({ [key]: [sector] })),
      ).toBe(true);
  });
  it("does not notify merely because a sector is publicly readable", () =>
    expect(isTaskRecipient(user(), task({ refSectors: [sector] }))).toBe(false));
  it("does not notify unrelated project owners or administrators without a reference", () =>
    expect(isTaskRecipient(user({ globalRole: "SUPERADMIN" }), task())).toBe(false));
  it("excludes reader and client roles even when explicitly referenced", () => {
    for (const globalRole of ["READER", "CLIENT"] as const)
      expect(isTaskRecipient(user({ globalRole }), task({ refUserIds: new Set(["u"]) }))).toBe(
        false,
      );
  });
});
