import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  DELETE_OBJECTIVE_MODES,
  OBJECTIVE_DESCRIPTION_MAX,
  OBJECTIVE_TITLE_MAX,
  objectiveDescriptionSchema,
  objectiveTitleSchema,
  type DeleteObjectiveMode,
} from "@/lib/domain/objectives/validation";

/** objetivos: reglas únicas de título, descripción y modo de borrado (HTTP + MCP). */

describe("objetivos — topes", () => {
  it("mismos topes que Work.name / Work.description (plantilla ↔ objetivo 1 a 1)", () => {
    expect(OBJECTIVE_TITLE_MAX).toBe(120);
    expect(OBJECTIVE_DESCRIPTION_MAX).toBe(280);
  });
});

describe("objectiveTitleSchema", () => {
  it("recorta espacios", () => {
    expect(objectiveTitleSchema.parse("  Instalación eléctrica  ")).toBe("Instalación eléctrica");
  });

  it("vacío o solo espacios → error con mensaje en castellano", () => {
    for (const input of ["", "   ", "\t\n"]) {
      const result = objectiveTitleSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("El objetivo necesita un título");
    }
  });

  it("acepta exactamente el tope y rechaza uno más", () => {
    expect(objectiveTitleSchema.safeParse("a".repeat(OBJECTIVE_TITLE_MAX)).success).toBe(true);
    expect(objectiveTitleSchema.safeParse("a".repeat(OBJECTIVE_TITLE_MAX + 1)).success).toBe(false);
  });

  it("el tope se mide después de recortar", () => {
    const padded = `  ${"a".repeat(OBJECTIVE_TITLE_MAX)}  `;
    expect(objectiveTitleSchema.parse(padded)).toHaveLength(OBJECTIVE_TITLE_MAX);
  });

  it("rechaza lo que no es string", () => {
    expect(objectiveTitleSchema.safeParse(null).success).toBe(false);
    expect(objectiveTitleSchema.safeParse(42).success).toBe(false);
  });
});

describe("objectiveDescriptionSchema", () => {
  it("recorta espacios", () => {
    expect(objectiveDescriptionSchema.parse("  Alcance del trabajo  ")).toBe("Alcance del trabajo");
  });

  it("vacío es válido (el consumidor lo guarda como null con `|| null`)", () => {
    expect(objectiveDescriptionSchema.parse("")).toBe("");
    expect(objectiveDescriptionSchema.parse("   ")).toBe("");
    expect(objectiveDescriptionSchema.parse("   ") || null).toBeNull();
  });

  it("acepta exactamente el tope y rechaza uno más", () => {
    expect(objectiveDescriptionSchema.safeParse("a".repeat(OBJECTIVE_DESCRIPTION_MAX)).success).toBe(true);
    expect(objectiveDescriptionSchema.safeParse("a".repeat(OBJECTIVE_DESCRIPTION_MAX + 1)).success).toBe(false);
  });

  it("el tope se mide después de recortar", () => {
    const padded = `  ${"a".repeat(OBJECTIVE_DESCRIPTION_MAX)}  `;
    expect(objectiveDescriptionSchema.parse(padded)).toHaveLength(OBJECTIVE_DESCRIPTION_MAX);
  });

  it("se compone como opcional y nullable en un body", () => {
    const body = z.object({ title: objectiveTitleSchema, description: objectiveDescriptionSchema.nullable().optional() });
    expect(body.parse({ title: "X" })).toEqual({ title: "X" });
    expect(body.parse({ title: "X", description: null })).toEqual({ title: "X", description: null });
    expect(body.parse({ title: " X ", description: " d " })).toEqual({ title: "X", description: "d" });
  });
});

describe("DELETE_OBJECTIVE_MODES", () => {
  it("exactamente los dos modos del diálogo, en orden", () => {
    expect(DELETE_OBJECTIVE_MODES).toEqual(["deleteTasks", "moveToGeneral"]);
    expectTypeOf<DeleteObjectiveMode>().toEqualTypeOf<"deleteTasks" | "moveToGeneral">();
  });

  it("sirve para z.enum y rechaza los nombres descartados", () => {
    const mode = z.enum(DELETE_OBJECTIVE_MODES);
    expect(mode.parse("deleteTasks")).toBe("deleteTasks");
    expect(mode.parse("moveToGeneral")).toBe("moveToGeneral");
    for (const legacy of ["keepTasks", "withTasks", "", undefined]) {
      expect(mode.safeParse(legacy).success).toBe(false);
    }
  });
});
