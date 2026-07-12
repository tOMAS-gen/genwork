import { describe, it, expect } from "vitest";
import { fingerprint } from "@/lib/errors/fingerprint";

describe("fingerprint", () => {
  it("produce el mismo hash para el mismo mensaje y ruta", () => {
    const a = fingerprint("Cannot read properties of null", "POST /api/works/[id]/tasks");
    const b = fingerprint("Cannot read properties of null", "POST /api/works/[id]/tasks");
    expect(a).toBe(b);
  });

  it("produce hashes distintos si cambia el mensaje", () => {
    const a = fingerprint("Error A", "POST /api/works/[id]/tasks");
    const b = fingerprint("Error B", "POST /api/works/[id]/tasks");
    expect(a).not.toBe(b);
  });

  it("produce hashes distintos si cambia la ruta", () => {
    const a = fingerprint("Cannot read properties of null", "POST /api/works/[id]/tasks");
    const b = fingerprint("Cannot read properties of null", "GET /api/works/[id]");
    expect(a).not.toBe(b);
  });
});
