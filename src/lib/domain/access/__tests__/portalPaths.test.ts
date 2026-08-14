import { describe, it, expect } from "vitest";
import { isPathAllowedForClient } from "@/lib/domain/access/portalPaths";

describe("isPathAllowedForClient — feature 059, FR-014", () => {
  const permitidas = [
    "/portal",
    "/portal/works/abc-123",
    "/api/portal",
    "/api/portal/works",
    "/api/portal/works/abc-123/activity",
    "/api/auth/signin",
    "/api/auth/callback/google",
    "/api/me/profile",
    "/login",
  ];

  it.each(permitidas)("permite %s", (p) => {
    expect(isPathAllowedForClient(p)).toBe(true);
  });

  const denegadas = [
    "/",
    "/board",
    "/works/abc-123",
    "/sectors/s1",
    "/groups",
    "/notes",
    "/admin",
    "/admin/clients",
    "/tv",
    "/api/works",
    "/api/works/abc-123",
    "/api/tasks",
    "/api/board",
    "/api/stream",
    "/api/notes",
    "/api/mcp",
  ];

  it.each(denegadas)("deniega %s", (p) => {
    expect(isPathAllowedForClient(p)).toBe(false);
  });

  it("no confunde un prefijo de texto con un segmento", () => {
    // La trampa clásica de startsWith pelado.
    expect(isPathAllowedForClient("/api/portalish")).toBe(false);
    expect(isPathAllowedForClient("/portalero")).toBe(false);
    expect(isPathAllowedForClient("/logins")).toBe(false);
    expect(isPathAllowedForClient("/api/mecanico")).toBe(false);
  });
});
