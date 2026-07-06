"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/components/ui/useApi";
import { BookTemplate } from "@/components/ui/icons";

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
  _count?: { tasks: number };
  taskCounts?: { done: number; total: number };
}

/**
 * Selector de plantillas (T011): lista proyectos marcados como plantilla y
 * devuelve el id elegido para clonar sus tareas en un proyecto nuevo.
 * NOTA: `?filter=templates` todavía no filtra en el backend (llega en T013);
 * mientras tanto se tolera que la respuesta traiga proyectos normales.
 */
export function TemplateSelector({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    void api<TemplateOption[]>("/api/works?filter=templates")
      .then(setTemplates)
      .catch(() => setError("No se pudieron cargar las plantillas"))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSelect = (templateId: string) => {
    onSelect(templateId);
    onClose();
  };

  const taskCountOf = (template: TemplateOption) =>
    template.taskCounts?.total ?? template._count?.tasks;

  return (
    <Dialog open={open} onClose={onClose} title="Elegir plantilla">
      {loading ? (
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          <Skeleton variant="card" height="56px" />
          <Skeleton variant="card" height="56px" />
        </div>
      ) : error ? (
        <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={BookTemplate}
          title="No hay plantillas todavía"
          description="Marcá un proyecto como plantilla para poder reutilizarlo acá."
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-sm)" }}>
          {templates.map((template) => {
            const taskCount = taskCountOf(template);
            return (
              <li key={template.id}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleSelect(template.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-sm)",
                    padding: "10px 12px",
                    justifyContent: "flex-start",
                    textAlign: "left",
                  }}
                >
                  <span className="pc-template-badge" aria-hidden="true">
                    <BookTemplate size={14} />
                  </span>
                  <span style={{ display: "grid", gap: "2px", minWidth: 0 }}>
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {template.name}
                    </span>
                    <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
                      {typeof taskCount === "number"
                        ? `${taskCount} ${taskCount === 1 ? "tarea" : "tareas"}`
                        : "Cantidad de tareas no disponible"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="dialog-actions">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Dialog>
  );
}
