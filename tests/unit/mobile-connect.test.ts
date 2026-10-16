import { describe, expect, it } from "vitest";
import { buildConnectPayload, isLocalOrigin, systemName } from "@/lib/mobile/connect";

describe("buildConnectPayload", () => {
  it("arma genwork://connect solo con server codificado", () => {
    expect(buildConnectPayload("https://work.test")).toBe(
      "genwork://connect?server=https%3A%2F%2Fwork.test",
    );
  });

  it("round-trip: se puede leer con URL", () => {
    const url = new URL(buildConnectPayload("https://work.test/base"));
    expect(url.protocol).toBe("genwork:");
    expect(url.host).toBe("connect");
    expect(url.searchParams.get("server")).toBe("https://work.test/base");
    expect([...url.searchParams.keys()]).toEqual(["server"]);
  });

  it("nunca incluye credenciales", () => {
    const payload = buildConnectPayload("https://work.test");
    expect(payload).not.toMatch(/token|password|secret/i);
  });
});

describe("systemName", () => {
  it("usa SYSTEM_NAME si está definido", () => {
    expect(systemName("https://work.test", "  Taller Norte ")).toBe("Taller Norte");
  });
  it("cae al host del servidor", () => {
    expect(systemName("https://work.gen.net.ar", undefined)).toBe("work.gen.net.ar");
    expect(systemName("https://work.gen.net.ar", "   ")).toBe("work.gen.net.ar");
  });
  it("incluye el puerto si no es el estándar", () => {
    expect(systemName("http://192.168.0.10:3010", undefined)).toBe("192.168.0.10:3010");
  });
});

describe("isLocalOrigin", () => {
  it("detecta orígenes que el teléfono no puede alcanzar", () => {
    expect(isLocalOrigin("http://localhost:3010")).toBe(true);
    expect(isLocalOrigin("http://127.0.0.1:3010")).toBe(true);
    expect(isLocalOrigin("https://work.gen.net.ar")).toBe(false);
    expect(isLocalOrigin("http://192.168.0.10:3010")).toBe(false);
  });
});
