"use client";

import Link from "next/link";

interface TaskGroupHeaderProps {
  work?: { id: string; name: string; status?: string; group: { id: string; name: string } | null };
  sector?: { id: string; name: string; group: { id: string; name: string } | null };
}

/**
 * Encabezado visual para un grupo de tareas que pertenecen al mismo proyecto
 * dentro de la vista de un sector (feature 055).
 *
 * Diseñado para ser escaneable de un vistazo: muestra el grupo al que pertenece
 * el proyecto y el nombre del proyecto, con fondo suave, borde sutil,
 * tipografía diferenciada y truncamiento con ellipsis para nombres largos.
 */
export function TaskGroupHeader({ work, sector }: TaskGroupHeaderProps) {
  const source = work ?? sector;
  if (!source) return null;

  const typeLabel = work ? "Proyecto" : "Sector";
  const label = source.group ? `${source.name} — ${source.group.name}` : source.name;
  const href = work ? `/works/${work.id}` : `/sectors/${sector!.id}`;

  return (
    <div
      className="task-group-header"
      title={label}
      aria-label={source.group ? `${typeLabel}: ${source.name}. Grupo: ${source.group.name}` : `${typeLabel}: ${source.name}`}
    >
      <Link href={href} className="task-group-header-link">
        {label}
      </Link>
    </div>
  );
}
