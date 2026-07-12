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
export const badRequest = (msg: string, extra?: Record<string, unknown>) =>
  new ApiError(400, "INVALID_INPUT", msg, extra);
export const forbidden = (msg = "No tenés permiso para esta acción") =>
  new ApiError(403, "FORBIDDEN", msg);
export const notFound = (msg = "No encontrado") => new ApiError(404, "NOT_FOUND", msg);
export const conflict = (msg: string, extra?: Record<string, unknown>) =>
  new ApiError(409, "CONFLICT", msg, extra);

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

/**
 * Reconstruye una ruta "plantilla" (ej. `POST /api/works/[id]/tasks`) a partir de
 * la URL resuelta, sustituyendo los valores de los parámetros dinámicos por su
 * nombre — así errores del mismo endpoint con distinto `id` agrupan bajo el mismo
 * `fingerprint` (FR-007).
 */
function routeTemplate(pathname: string, params: Record<string, string> | undefined): string {
  if (!params) return pathname;
  let template = pathname;
  for (const [key, value] of Object.entries(params)) {
    if (value) template = template.split(value).join(`[${key}]`);
  }
  return template;
}

/**
 * Captura best-effort de un error no controlado del handler (FR-001, FR-010).
 * Importa `auth`/`logError` de forma dinámica (no en el top del módulo) para que
 * `@/server/api` siga siendo importable por tests de lógica pura sin arrastrar
 * next-auth (y su dependencia de `next/server`, que no resuelve fuera del runtime
 * de Next.js/Vitest con entorno "node").
 */
async function captureUnhandledError(err: unknown, req: Request, ctx: unknown): Promise<void> {
  try {
    const rawParams = (ctx as { params?: Promise<Record<string, string>> | Record<string, string> } | undefined)
      ?.params;
    const params = rawParams ? await rawParams : undefined;
    const pathname = new URL(req.url).pathname;
    const [{ auth }, { logError }] = await Promise.all([import("@/server/auth"), import("@/lib/errors/log")]);
    const session = await auth().catch(() => null);
    await logError(err, {
      route: `${req.method} ${routeTemplate(pathname, params)}`,
      method: req.method,
      userId: session?.user?.id ?? null,
      data: params,
    });
  } catch (loggingError) {
    console.error("captureUnhandledError: fallo al preparar la captura:", loggingError);
  }
}

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
      await captureUnhandledError(err, req, ctx);
      return NextResponse.json(
        { error: { code: "INTERNAL", message: "Error interno" } },
        { status: 500 },
      );
    }
  };
}
