/** Asignación automática de color a sectores nuevos — función pura, sin I/O. */

import { PRESET_COLORS } from "@/lib/domain/colors/palette";

/**
 * Colores disponibles para sectores: la paleta hex unificada (`PRESET_COLORS`),
 * en su orden original (cálidos, fríos y neutros intercalados).
 */
export const SECTOR_COLORS: readonly string[] = PRESET_COLORS.map((c) => c.hex);

/**
 * Asigna el color que le corresponde al próximo sector de un ámbito, en base a la
 * cantidad de sectores ya existentes en ese ámbito. Rotación cíclica: cuando se agotan
 * los colores de SECTOR_COLORS, se vuelve a empezar desde el primero.
 */
export function assignSectorColor(existingCount: number): string {
  return SECTOR_COLORS[existingCount % SECTOR_COLORS.length];
}
