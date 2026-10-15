import { describe, expect, it } from "vitest";
import { buildConnectPayload } from "@/lib/mobile/connect";
import { renderQrSvg } from "@/lib/mobile/qr";

describe("renderQrSvg", () => {
  it("devuelve un SVG con el QR", async () => {
    const svg = await renderQrSvg(buildConnectPayload("https://work.test"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });

  it("es determinístico para el mismo payload", async () => {
    const payload = buildConnectPayload("https://work.test");
    expect(await renderQrSvg(payload)).toBe(await renderQrSvg(payload));
  });
});
