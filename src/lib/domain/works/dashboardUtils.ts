/** Utilidades puras para el dashboard de proyectos (estado y vencimiento). */

/**
 * Determina el estado de un proyecto a partir de sus tareas completadas y totales.
 * - `pending`: no hay tareas completadas o no hay tareas (done === 0 o total === 0).
 * - `completed`: todas las tareas están completadas (done === total, con total > 0).
 * - `in_progress`: cualquier otro caso (0 < done < total).
 */
export function getProjectStatus(
  done: number,
  total: number,
): 'pending' | 'in_progress' | 'completed' {
  if (done === 0 || total === 0) {
    return 'pending';
  }
  if (done === total) {
    return 'completed';
  }
  return 'in_progress';
}

/**
 * Urgencia de una fecha límite, con el mismo criterio que la app Android
 * (`dueUrgency`, spec 066 T42): etiqueta larga, forma corta para una línea de
 * meta («29 oct · 3 días») y tono.
 */
export interface DueDateUrgency {
  label: string;
  short: string;
  tone: 'neutral' | 'warning' | 'danger';
}

/**
 * Calcula la urgencia de una fecha límite en base a los días restantes hasta hoy.
 * - Sin fecha: null.
 * - Más de 3 días restantes: neutro.
 * - De hoy a 3 días: ámbar.
 * - Vencido: rojo.
 *
 * La entrega es un día de calendario guardado a medianoche UTC (ver
 * `formatDueDate`): se toma su día en UTC y se compara con el día de hoy en la
 * zona local, ignorando la hora, para que "hoy" sea siempre 0.
 */
export function getDueDateUrgency(dueDate: Date | null): DueDateUrgency | null {
  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.round((due - today) / msPerDay);

  const label =
    daysRemaining < 0
      ? 'Vencido'
      : daysRemaining === 0
        ? 'Vence hoy'
        : daysRemaining === 1
          ? '1 día restante'
          : `${daysRemaining} días restantes`;
  const short =
    daysRemaining < 0
      ? 'Vencido'
      : daysRemaining === 0
        ? 'Hoy'
        : daysRemaining === 1
          ? '1 día'
          : `${daysRemaining} días`;
  // Con más de 3 días, neutro; de hoy a 3 días, ámbar; vencido, rojo.
  const tone = daysRemaining > 3 ? 'neutral' : daysRemaining >= 0 ? 'warning' : 'danger';

  return { label, short, tone };
}
