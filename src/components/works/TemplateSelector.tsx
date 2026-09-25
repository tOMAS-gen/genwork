"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/components/ui/useApi";
import { BookTemplate } from "@/components/ui/icons";

/** Plantilla tal como la lista el dashboard (`GET /api/works?filter=templates`). */
interface DashboardTemplate {
  id: string;
  name: string;
  description: string | null;
  taskCounts?: { done: number; total: number };
}

/** Lo que muestra `TemplateOptionList` de cada plantilla; cada llamador arma `meta`. */
export interface TemplateOptionItem {
  id: string;
  name: string;
  description: string | null;
  /** Línea secundaria (ej. "3 tareas pendientes · Grupo Obras"). */
  meta: string;
}

/** "Sin tareas pendientes" / "1 tarea pendiente" / "N tareas pendientes". */
export function templateTaskLabel(count: number): string {
  if (count <= 0) return "Sin tareas pendientes";
  return count === 1 ? "1 tarea pendiente" : `${count} tareas pendientes`;
}

export const TEMPLATE_EMPTY_TITLE = "No hay plantillas de objetivo";
export const TEMPLATE_EMPTY_DESCRIPTION =
  "Creá una desde Plantillas de objetivo, o guardá un objetivo como plantilla desde su menú ⋮.";

/**
 * objetivos: lista de plantillas de objetivo, compartida por el selector del
 * dashboard ("Nuevo proyecto desde plantilla") y `AddObjectiveDialog`
 * ("Desde plantilla"). Con `selectedId` los botones son seleccionables
 * (`aria-pressed`); sin él, cada botón elige y listo.
 */
export function TemplateOptionList({
  items,
  loading,
  error,
  selectedId,
  onSelect,
}: {
  items: TemplateOptionItem[];
  loading: boolean;
  error: string;
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ display: "grid", gap: "var(--space-sm)" }}>
        <Skeleton variant="card" height="56px" />
        <Skeleton variant="card" height="56px" />
      </div>
    );
  }
  if (error) return <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>;
  if (items.length === 0) {
    return <EmptyState icon={BookTemplate} title={TEMPLATE_EMPTY_TITLE} description={TEMPLATE_EMPTY_DESCRIPTION} />;
  }
  const selectable = selectedId !== undefined;
  return (
    <ul className="template-option-list">
      {items.map((t) => {
        const selected = selectable && t.id === selectedId;
        return (
          <li key={t.id}>
            <button
              type="button"
              className={`template-option${selected ? " is-selected" : ""}`}
              aria-pressed={selectable ? selected : undefined}
              onClick={() => onSelect(t.id)}
            >
              <span className="pc-template-badge" aria-hidden="true">
                <BookTemplate size={14} />
              </span>
              <span className="template-option-text">
                <span className="template-option-name">{t.name}</span>
                <span className="template-option-meta">{t.meta}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Selector de plantillas del dashboard (T011): elige la plantilla de objetivo
 * con la que nace un proyecto nuevo (el proyecto se crea con ese objetivo ya
 * insertado). Sigue leyendo `GET /api/works?filter=templates`, el mismo DTO que
 * la grilla del dashboard.
 */
export function TemplateSelector({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (template: { id: string; name: string }) => void;
}) {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    void api<DashboardTemplate[]>("/api/works?filter=templates")
      .then(setTemplates)
      .catch(() => setError("No se pudieron cargar las plantillas"))
      .finally(() => setLoading(false));
  }, [open]);

  // 062-subtareas: `taskCounts` sigue la regla de contenedor (cuenta hojas).
  const items: TemplateOptionItem[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    meta: t.taskCounts
      ? templateTaskLabel(t.taskCounts.total - t.taskCounts.done)
      : "Cantidad de tareas no disponible",
  }));

  return (
    <Dialog open={open} onClose={onClose} title="Elegir plantilla de objetivo">
      <TemplateOptionList
        items={items}
        loading={loading}
        error={error}
        onSelect={(id) => {
          const template = templates.find((t) => t.id === id);
          if (!template) return;
          onSelect({ id: template.id, name: template.name });
          onClose();
        }}
      />
      <div className="dialog-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Dialog>
  );
}
