"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  TemplateOptionList,
  templateTaskLabel,
  type TemplateOptionItem,
} from "@/components/works/TemplateSelector";
import { CharLimit } from "@/components/ui/CharLimit";
import { OBJECTIVE_DESCRIPTION_MAX, OBJECTIVE_TITLE_MAX } from "@/lib/domain/objectives/validation";
import {
  createObjective,
  insertTemplateAsObjective,
  listTemplates,
  type ObjectiveDto,
  type TemplateSummaryDto,
} from "./objectiveApi";

type Mode = "blank" | "template";

/** Aviso de "Desde plantilla": cuántas tareas se copian (o que queda vacío). */
export function templateCopyNotice(count: number): string {
  if (count <= 0) return "La plantilla no tiene tareas pendientes: el objetivo queda vacío.";
  const tasks = count === 1 ? "Se copia 1 tarea pendiente" : `Se copian ${count} tareas pendientes`;
  return `${tasks} (con sus subtareas). La copia es independiente de la plantilla.`;
}

function templateMeta(t: TemplateSummaryDto): string {
  const scope = t.groupName ? `Grupo ${t.groupName}` : "Personal";
  return `${templateTaskLabel(t.copyableTaskCount)} · ${scope}`;
}

/**
 * objetivos: "+ Nuevo objetivo" de la página de proyecto. Dos modos:
 * - "En blanco": título y descripción opcional.
 * - "Desde plantilla": lista de plantillas de objetivo; elegir una rellena el
 *   título (editable) y avisa cuántas tareas se copian. La descripción viene
 *   de la plantilla (D3: al insertar solo se edita el título).
 * Si falla, queda abierto con el error del backend.
 */
export function AddObjectiveDialog({
  open,
  onClose,
  workId,
  onCreated,
  initialMode = "blank",
}: {
  open: boolean;
  onClose: () => void;
  workId: string;
  onCreated: (objective: ObjectiveDto) => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templates, setTemplates] = useState<TemplateSummaryDto[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Resetea todo cada vez que se abre.
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setTitle("");
    setDescription("");
    setSelectedId(null);
    setSaving(false);
    setError("");
  }, [open, initialMode]);

  // Las plantillas se piden solo al entrar al modo "Desde plantilla".
  useEffect(() => {
    if (!open || mode !== "template") return;
    setTemplatesLoading(true);
    setTemplatesError("");
    listTemplates()
      .then(setTemplates)
      .catch(() => setTemplatesError("No se pudieron cargar las plantillas"))
      .finally(() => setTemplatesLoading(false));
  }, [open, mode]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const trimmed = title.trim();
  const canSubmit = !saving && trimmed.length > 0 && (mode === "blank" || !!selected);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const objective =
        mode === "blank"
          ? await createObjective(workId, { title: trimmed, description: description.trim() || null })
          : await insertTemplateAsObjective(workId, { templateId: selected!.id, title: trimmed });
      onCreated(objective);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const items: TemplateOptionItem[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    meta: templateMeta(t),
  }));

  return (
    <Dialog open={open} onClose={onClose} title="Nuevo objetivo">
      <div className="segmented objective-mode" role="group" aria-label="Cómo crear el objetivo">
        <button
          type="button"
          className={`segmented-btn${mode === "blank" ? " is-active" : ""}`}
          aria-pressed={mode === "blank"}
          onClick={() => setMode("blank")}
        >
          En blanco
        </button>
        <button
          type="button"
          className={`segmented-btn${mode === "template" ? " is-active" : ""}`}
          aria-pressed={mode === "template"}
          onClick={() => setMode("template")}
        >
          Desde plantilla
        </button>
      </div>

      {mode === "template" && (
        <div className="objective-template-picker">
          <TemplateOptionList
            items={items}
            loading={templatesLoading}
            error={templatesError}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              const t = templates.find((x) => x.id === id);
              if (t) setTitle(t.name.slice(0, OBJECTIVE_TITLE_MAX));
            }}
          />
        </div>
      )}

      {(mode === "blank" || selected) && (
        <div className="dialog-field">
          <label htmlFor="objective-add-title">Título del objetivo</label>
          <input
            id="objective-add-title"
            autoFocus={mode === "blank"}
            value={title}
            maxLength={OBJECTIVE_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder="Ej.: Instalación eléctrica"
          />
        </div>
      )}

      {mode === "blank" && (
        <div className="dialog-field">
          <label htmlFor="objective-add-desc">Descripción (opcional)</label>
          <textarea
            id="objective-add-desc"
            rows={2}
            value={description}
            maxLength={OBJECTIVE_DESCRIPTION_MAX}
            aria-describedby="objective-add-desc-limit"
            onChange={(e) => setDescription(e.target.value)}
          />
          <CharLimit id="objective-add-desc-limit" length={description.length} max={OBJECTIVE_DESCRIPTION_MAX} />
        </div>
      )}

      {mode === "template" && selected && (
        <div className="objective-template-notice" aria-live="polite">
          {selected.description && <p className="objective-template-desc">{selected.description}</p>}
          <p>{templateCopyNotice(selected.copyableTaskCount)}</p>
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={!canSubmit} onClick={() => void submit()}>
          {mode === "blank" ? "Crear objetivo" : "Insertar plantilla"}
        </button>
      </div>
    </Dialog>
  );
}
