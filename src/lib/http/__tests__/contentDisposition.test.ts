import { describe, expect, it } from "vitest";
import { contentDisposition } from "@/lib/http/contentDisposition";

describe("contentDisposition", () => {
  it("nombre ASCII: respaldo igual al nombre", () => {
    expect(contentDisposition("attachment", "plano.pdf")).toBe(
      `attachment; filename="plano.pdf"; filename*=UTF-8''plano.pdf`,
    );
  });

  it("tilde combinante (macOS): el header es latin-1 y Response no lanza", () => {
    const nfd = "Disen\u0303o lona.pdf";
    const header = contentDisposition("attachment", nfd);
    expect(header).toBe(
      `attachment; filename="Diseno lona.pdf"; filename*=UTF-8''Dise%C3%B1o%20lona.pdf`,
    );
    expect(() => new Response("x", { headers: { "Content-Disposition": header } })).not.toThrow();
  });

  it("comillas, barras y no latinos no rompen el respaldo", () => {
    const header = contentDisposition("inline", 'a"b\\c 日本.png');
    expect(header).toBe(
      `inline; filename="a_b_c __.png"; filename*=UTF-8''a%22b%5Cc%20%E6%97%A5%E6%9C%AC.png`,
    );
    expect(() => new Response("x", { headers: { "Content-Disposition": header } })).not.toThrow();
  });

  it("nombre vacío tras limpiar → respaldo genérico", () => {
    expect(contentDisposition("attachment", "日本")).toContain(`filename="__"`);
    expect(contentDisposition("attachment", "")).toContain(`filename="archivo"`);
  });
});
