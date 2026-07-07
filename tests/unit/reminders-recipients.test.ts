import { describe, it, expect } from "vitest";
import { resolveRecipients } from "@/lib/domain/reminders/recipients";

describe("resolveRecipients", () => {
  it("INDIVIDUAL: solo el owner", () => {
    expect(
      resolveRecipients("INDIVIDUAL", { ownerId: "u1", groupMemberIds: ["u2", "u3"], allUserIds: ["u1", "u2"] }),
    ).toEqual(["u1"]);
  });

  it("INDIVIDUAL sin owner: vacío", () => {
    expect(resolveRecipients("INDIVIDUAL", { ownerId: null, groupMemberIds: [], allUserIds: [] })).toEqual([]);
  });

  it("GROUP: todos los miembros vigentes (sin duplicados)", () => {
    const r = resolveRecipients("GROUP", { ownerId: null, groupMemberIds: ["a", "b", "a"], allUserIds: ["x"] });
    expect(r.sort()).toEqual(["a", "b"]);
  });

  it("GROUP: un miembro que ya no está no recibe", () => {
    // membresía vigente al disparo = ['a','b'] (c salió)
    const r = resolveRecipients("GROUP", { ownerId: null, groupMemberIds: ["a", "b"], allUserIds: [] });
    expect(r).not.toContain("c");
  });

  it("GLOBAL: todos los usuarios del sistema (sin duplicados)", () => {
    const r = resolveRecipients("GLOBAL", { ownerId: null, groupMemberIds: [], allUserIds: ["u1", "u2", "u2", "u3"] });
    expect(r.sort()).toEqual(["u1", "u2", "u3"]);
  });
});
