import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, badRequest, withApi } from "@/server/api";
import { redeemAuthCode } from "@/server/mobile-auth";

const bodySchema = z.object({
  code: z.string().min(1).max(200),
  codeVerifier: z.string().min(43).max(128),
  deviceName: z.string().trim().min(1).max(100).default("Dispositivo móvil"),
});

/**
 * Feature 064: canje del código de login por el token Bearer de la app. Única vez
 * que el token en texto plano viaja; la app lo guarda en el almacenamiento seguro.
 */
export const POST = withApi(async (req) => {
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw badRequest(body.error.issues[0]?.message ?? "Datos inválidos");

  const result = await redeemAuthCode(body.data.code, body.data.codeVerifier, body.data.deviceName);
  if (!result) {
    throw new ApiError(400, "INVALID_GRANT", "El código de ingreso es inválido o venció. Volvé a intentar.");
  }
  return NextResponse.json(result);
});
