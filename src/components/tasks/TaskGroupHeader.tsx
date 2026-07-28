"use client";

import Link from "next/link";

interface TaskGroupHeaderProps {
  work: { id: string; name: string; status: string };
}

/**
 * Encabezado visual para un grupo de tareas que pertenecen al mismo proyecto
 * dentro de la vista de un sector (feature 055).
 *
 * Diseñado para ser escaneable de un vistazo: fondo suave, borde sutil,
 * tipografía diferenciada y truncamiento con ellipsis para nombres largos.
 */
export function TaskGroupHeader({ work }: TaskGroupHeaderProps) {
  return (
    <div
      className="task-group-header"
      title={work.name}
      aria-label={`Proyecto: ${work.name}`}
    >
      <Link href={`/works/${work.id}`} className="task-group-header-link">
        {work.name}
      </Link>
    </div>
  );
}
