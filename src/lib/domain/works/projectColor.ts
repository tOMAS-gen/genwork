/** Color representativo de un proyecto en base a sus etiquetas (labels) asignadas. */

/** Subconjunto de WorkLabelDto (ver src/components/works/LabelPicker.tsx) que necesita esta función. */
interface WorkLabelLike {
  keyName: string;
  color: string;
  /** Si esta asignación es LA etiqueta principal del proyecto (ver WorkLabel.isPrimary). */
  isPrimary?: boolean;
}

/**
 * Determina el color representativo de un proyecto a partir de sus etiquetas.
 * - Si hay una etiqueta marcada como principal, devuelve su color.
 * - Si no, cae al comportamiento previo: ordena por `keyName` ascendente (orden
 *   alfabético determinístico) y devuelve el color de la primera.
 * - Sin etiquetas: null (sin color representativo).
 */
export function getProjectColor(labels: readonly WorkLabelLike[]): string | null {
  if (labels.length === 0) {
    return null;
  }
  const primary = labels.find((l) => l.isPrimary);
  if (primary) return primary.color;
  const sorted = [...labels].sort((a, b) => a.keyName.localeCompare(b.keyName));
  return sorted[0].color;
}
