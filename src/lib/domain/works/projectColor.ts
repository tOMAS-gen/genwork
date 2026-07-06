/** Color representativo de un proyecto en base a sus etiquetas (labels) asignadas. */

/** Subconjunto de WorkLabelDto (ver src/components/works/LabelPicker.tsx) que necesita esta función. */
interface WorkLabelLike {
  keyName: string;
  color: string;
}

/**
 * Determina el color representativo de un proyecto a partir de sus etiquetas.
 * - Ordena las etiquetas por `keyName` ascendente (orden alfabético determinístico).
 * - Devuelve el `color` de la primera etiqueta tras ordenar.
 * - Sin etiquetas: null (sin color representativo).
 */
export function getProjectColor(labels: readonly WorkLabelLike[]): string | null {
  if (labels.length === 0) {
    return null;
  }
  const sorted = [...labels].sort((a, b) => a.keyName.localeCompare(b.keyName));
  return sorted[0].color;
}
