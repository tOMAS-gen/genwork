import { describe, it, expect } from "vitest";
import { isEmailAllowed, normalizeEmail } from "@/lib/domain/access";

const listRules = (emails: string[]) => ({
  mode: "LIST" as const,
  domain: null,
  allowedEmails: new Set(emails.map(normalizeEmail)),
});

const domainRules = (domain: string) => ({
  mode: "DOMAIN" as const,
  domain,
  allowedEmails: new Set<string>(),
});

describe("isEmailAllowed — modo LIST (FR-019b)", () => {
  it("permite solo correos de la lista, insensible a mayúsculas", () => {
    const rules = listRules(["Tomas@Gen.net.ar"]);
    expect(isEmailAllowed(rules, "tomas@gen.net.ar")).toBe(true);
    expect(isEmailAllowed(rules, "TOMAS@GEN.NET.AR")).toBe(true);
    expect(isEmailAllowed(rules, "otro@gen.net.ar")).toBe(false);
  });

  it("quitar un correo revoca el acceso (edge case spec)", () => {
    expect(isEmailAllowed(listRules([]), "tomas@gen.net.ar")).toBe(false);
  });
});

describe("isEmailAllowed — modo DOMAIN (FR-019a)", () => {
  it("permite todo el dominio configurado", () => {
    const rules = domainRules("empresa.com");
    expect(isEmailAllowed(rules, "juan@empresa.com")).toBe(true);
    expect(isEmailAllowed(rules, "juan@otra.com")).toBe(false);
  });

  it("acepta el dominio escrito con @ inicial y mayúsculas", () => {
    expect(isEmailAllowed(domainRules("@Empresa.com"), "ana@empresa.com")).toBe(true);
  });

  it("no permite dominios que solo terminan parecido", () => {
    expect(isEmailAllowed(domainRules("empresa.com"), "x@malaempresa.com")).toBe(false);
  });

  it("dominio sin configurar no permite a nadie", () => {
    expect(isEmailAllowed({ mode: "DOMAIN", domain: null, allowedEmails: new Set() }, "a@b.c")).toBe(
      false,
    );
  });
});
