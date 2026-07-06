"use client";

import type { LucideIcon } from "lucide-react";

/**
 * Estado vacío genérico (feature 008): ícono + título + descripción + acción
 * opcional, centrado vertical y horizontal. Reutilizable en listas/vistas
 * sin contenido (proyectos, sectores, tareas, etc.).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void; href?: string };
}) {
  return (
    <div className="empty-state">
      <Icon size={48} className="empty-state-icon" aria-hidden="true" />
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-description">{description}</p>
      {action &&
        (action.href ? (
          <a className="btn btn-primary empty-state-action" href={action.href}>
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-primary empty-state-action"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
