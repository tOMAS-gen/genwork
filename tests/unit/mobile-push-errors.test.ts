import { describe, expect, it } from "vitest";
import { invalidToken, permanentFailure } from "@/server/notifications/push";

describe("clasificación de errores de FCM", () => {
  it("un token no registrado desactiva el dispositivo y no se reintenta", () => {
    expect(invalidToken("messaging/registration-token-not-registered")).toBe(true);
    expect(permanentFailure("messaging/registration-token-not-registered")).toBe(true);
  });

  it("un argumento inválido (token mal formado) no se reintenta ni desactiva el dispositivo", () => {
    expect(permanentFailure("messaging/invalid-argument")).toBe(true);
    expect(invalidToken("messaging/invalid-argument")).toBe(false);
  });

  it("las fallas temporales se reintentan", () => {
    for (const code of ["messaging/server-unavailable", "app/invalid-credential", "push/unavailable"]) {
      expect(permanentFailure(code)).toBe(false);
    }
  });
});
