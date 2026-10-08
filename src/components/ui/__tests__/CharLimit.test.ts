import { describe, expect, it } from "vitest";
import { charLimitState } from "@/components/ui/CharLimit";

describe("charLimitState", () => {
  it("muestra cuánto se usó del tope", () => {
    expect(charLimitState(120, 2000)).toEqual({ text: "120 / 2.000", level: "normal" });
  });

  it("desde el 90% se resalta", () => {
    expect(charLimitState(1799, 2000).level).toBe("normal");
    expect(charLimitState(1800, 2000)).toEqual({ text: "1.800 / 2.000", level: "near" });
  });

  it("en el tope avisa que no entra más", () => {
    expect(charLimitState(2000, 2000)).toEqual({
      text: "Llegaste al límite de 2.000 caracteres",
      level: "full",
    });
  });
});
