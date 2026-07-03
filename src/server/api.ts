import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Errores tipados del contrato: { error: { code, message } } con HTTP semántico. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, "UNAUTHORIZED", "Iniciá sesión para continuar");
export const forbidden = (msg = "No tenés permiso para esta acción") =>
  new ApiError(403, "FORBIDDEN", msg);
export const notFound = (msg = "No encontrado") => new ApiError(404, "NOT_FOUND", msg);
export const conflict = (msg: string, extra?: Record<string, unknown>) =>
  new ApiError(409, "CONFLICT", msg, extra);

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

/** Envuelve un route handler con manejo uniforme de errores. */
export function withApi<Ctx>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message, ...err.extra } },
          { status: err.status },
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: err.issues[0]?.message ?? "Datos inválidos" } },
          { status: 400 },
        );
      }
      if ((err as { status?: number }).status === 401) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Iniciá sesión para continuar" } },
          { status: 401 },
        );
      }
      console.error("API error:", err);
      return NextResponse.json(
        { error: { code: "INTERNAL", message: "Error interno" } },
        { status: 500 },
      );
    }
  };
}
