"use client";

import Link from "next/link";

interface TaskGroupHeaderProps {
  work: { id: string; name: string; status: string; group: { id: string; name: string } | null };
}

/**
 * Encabezado visual para un grupo de tareas que pertenecen al mismo proyecto
 * dentro de la vista de un sector (feature 055).
 *
 * Diseñado para ser escaneable de un vistazo: muestra el grupo al que pertenece
 * el proyecto y el nombre del proyecto, con fondo suave, borde sutil,
 * tipografía diferenciada y truncamiento con ellipsis para nombres largos.
 */
export function TaskGroupHeader({ work }: TaskGroupHeaderProps) {
  const label = work.group ? `${work.name} — ${work.group.name}` : work.name;
  return (
    <div
      className="task-group-header"
      title={label}
      aria-label={work.group ? `Proyecto: ${work.name}. Grupo: ${work.group.name}` : `Proyecto: ${work.name}`}
    >
      <Link href={`/works/${work.id}`} className="task-group-header-link">
        {label}
      </Link>
    </div>
  );
}
