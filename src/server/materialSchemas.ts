import { z } from "zod";
import { normalizeQuantity } from "@/lib/domain/materials/quantity";

const quantitySchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeQuantity(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresá una cantidad mayor a cero, con hasta 6 decimales",
      });
      return z.NEVER;
    }
    return normalized;
  });

const notesSchema = z.string().trim().max(280).nullable().optional();

export const createMaterialSchema = z.object({
  productId: z.string().uuid("Producto inválido"),
  quantityRequired: quantitySchema,
  notes: notesSchema,
});

export const updateMaterialSchema = z
  .object({
    quantityRequired: quantitySchema.optional(),
    notes: notesSchema,
  })
  .refine((value) => value.quantityRequired !== undefined || value.notes !== undefined, {
    message: "Nada para actualizar",
  });
