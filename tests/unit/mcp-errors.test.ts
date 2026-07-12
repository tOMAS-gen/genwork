import { describe, it, expect } from "vitest";
import { z } from "zod";
import { toToolErrorResult, toolSuccess, toolConfirmationRequired } from "@/lib/mcp/errors";
import { ApiError, forbidden, notFound, badRequest } from "@/server/api";
import { McpAuthError } from "@/server/mcp-auth";
import { ConfirmationError } from "@/lib/mcp/confirmation";

describe("toToolErrorResult", () => {
  it("mapea ApiError (permisos) preservando el mensaje de la web", () => {
    const result = toToolErrorResult(forbidden("No tenés permiso para esta acción"));
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: "text", text: "No tenés permiso para esta acción" });
  });

  it("mapea ApiError de no encontrado y de datos inválidos", () => {
    expect(toToolErrorResult(notFound("No encontrado")).content[0]).toMatchObject({ text: "No encontrado" });
    expect(toToolErrorResult(badRequest("Falta el sector")).content[0]).toMatchObject({ text: "Falta el sector" });
  });

  it("mapea McpAuthError", () => {
    const result = toToolErrorResult(new McpAuthError("Token MCP inválido, ausente o revocado"));
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ text: "Token MCP inválido, ausente o revocado" });
  });

  it("mapea ConfirmationError", () => {
    const result = toToolErrorResult(new ConfirmationError());
    expect(result.isError).toBe(true);
  });

  it("mapea ZodError al primer issue", () => {
    const parsed = z.object({ name: z.string() }).safeParse({});
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("unreachable");
    const result = toToolErrorResult(parsed.error);
    expect(result.isError).toBe(true);
  });

  it("mapea cualquier otro error a 'Error interno' sin filtrar detalles", () => {
    const result = toToolErrorResult(new Error("detalle interno sensible"));
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ text: "Error interno" });
  });

  it("ApiError genérico también se mapea correctamente", () => {
    const result = toToolErrorResult(new ApiError(409, "CONFLICT", "Ya existe"));
    expect(result.content[0]).toMatchObject({ text: "Ya existe" });
  });
});

describe("toolSuccess / toolConfirmationRequired", () => {
  it("toolSuccess arma content + structuredContent opcional", () => {
    const result = toolSuccess("listo", { id: "1" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]).toMatchObject({ type: "text", text: "listo" });
    expect(result.structuredContent).toEqual({ id: "1" });
  });

  it("toolConfirmationRequired expone confirmationToken en structuredContent", () => {
    const result = toolConfirmationRequired({
      confirmationToken: "abc",
      summary: "Vas a borrar el proyecto X",
      expiresAt: "2026-07-08T12:05:00.000Z",
    });
    expect(result.structuredContent).toMatchObject({
      status: "confirmation_required",
      confirmationToken: "abc",
    });
  });
});
