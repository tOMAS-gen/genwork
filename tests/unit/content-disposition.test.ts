import { describe, expect, it } from "vitest";
import { contentDisposition } from "@/server/content-disposition";

describe("contentDisposition — descarga con cualquier nombre de archivo", () => {
  it("nombre con caracteres fuera de Latin-1: header válido con el nombre real en filename*", () => {
    const header = contentDisposition("Informe — final (v2).pdf");
    // Un header con "—" crudo hace fallar la Response (la descarga terminaba en un JSON de error).
    expect(() => new Response("x", { headers: { "Content-Disposition": header } })).not.toThrow();
    expect(header).toBe(
      `attachment; filename="Informe  final (v2).pdf"; filename*=UTF-8''Informe%20%E2%80%94%20final%20%28v2%29.pdf`,
    );
  });

  it("acentos y comillas: respaldo ASCII sin romper el header", () => {
    expect(contentDisposition('Presupuesto "año".pdf')).toBe(
      `attachment; filename="Presupuesto _ano_.pdf"; filename*=UTF-8''Presupuesto%20%22a%C3%B1o%22.pdf`,
    );
  });
});
