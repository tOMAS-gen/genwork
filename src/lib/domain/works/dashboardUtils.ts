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

/** Urgencia calculada para una fecha límite, con etiqueta legible y color asociado. */
export interface DueDateUrgency {
  label: string;
  color: 'green' | 'orange' | 'red';
}

/**
 * Calcula la urgencia de una fecha límite en base a los días restantes hasta hoy.
 * - Sin fecha: null.
 * - Más de 7 días restantes: verde.
 * - Entre 1 y 7 días restantes: naranja.
 * - Hoy o vencido (<= 0 días): rojo.
 *
 * Los días se calculan comparando solo la parte de fecha (año-mes-día),
 * ignorando la hora, para que "hoy" sea siempre 0 sin importar la hora del día.
 */
export function getDueDateUrgency(dueDate: Date | null): DueDateUrgency | null {
  if (!dueDate) {
    return null;
  }

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.round((due.getTime() - today.getTime()) / msPerDay);

  let label: string;
  if (daysRemaining < 0) {
    label = 'Vencido';
  } else if (daysRemaining === 0) {
    label = 'Vence hoy';
  } else {
    label = `${daysRemaining} días restantes`;
  }

  let color: 'green' | 'orange' | 'red';
  if (daysRemaining > 7) {
    color = 'green';
  } else if (daysRemaining >= 1) {
    color = 'orange';
  } else {
    color = 'red';
  }

  return { label, color };
}
