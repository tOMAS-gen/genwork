/** Asignación automática de color a sectores nuevos — función pura, sin I/O. */

import { LabelColor } from "@prisma/client";

/**
 * Colores disponibles para sectores, en un orden visualmente diverso: se intercalan
 * tonos cálidos, fríos y neutros para evitar que sectores consecutivos (ej. RED, ORANGE,
 * AMBER) queden todos en la misma familia de color.
 */
export const SECTOR_COLORS: readonly LabelColor[] = [
  LabelColor.BLUE,
  LabelColor.ORANGE,
  LabelColor.VIOLET,
  LabelColor.GREEN,
  LabelColor.PINK,
  LabelColor.TEAL,
  LabelColor.RED,
  LabelColor.INDIGO,
  LabelColor.AMBER,
  LabelColor.GRAY,
];

/**
 * Asigna el color que le corresponde al próximo sector de un ámbito, en base a la
 * cantidad de sectores ya existentes en ese ámbito. Rotación cíclica: cuando se agotan
 * los colores de SECTOR_COLORS, se vuelve a empezar desde el primero.
 */
export function assignSectorColor(existingCount: number): LabelColor {
  return SECTOR_COLORS[existingCount % SECTOR_COLORS.length];
}
