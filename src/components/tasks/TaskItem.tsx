"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { X, Calendar } from "@/components/ui/icons";
import { Menu } from "@/components/ui/Menu";
import { canEditTaskText } from "@/lib/domain/tasks/ownership";
import { parseTags, normalizeTagName } from "@/lib/domain/tags/parser";
import { parseDates } from "@/lib/domain/dates/parser";
import { TaskInlineEdit } from "./TaskInlineEdit";

export interface TaskDto {
  id: string;
  /** Texto crudo (con etiquetas /#@) — lo usa la edición inline (T008, R2 de 004). */
  rawText: string;
  displayText: string;
  status: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  /** Conjunto de estados aplicable a esta tarea (feature 042, FR-011). */
  statusOptions: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL"; sortOrder: number }[];
  workId: string | null;
  work: { id: string; name: string } | null;
  /** Origen de la tarea y, si fue adoptada por el proyecto, cuándo (FR-401). */
  originType: "WORK" | "SECTOR";
  adoptedAt: string | null;
  homeSector: { id: string; name: string } | null;
  /** Etiquetas de proyecto asignadas a la tarea (feature 032): una por clave. */
  labels: { keyId: string; keyName: string; valueId: string; valueName: string; color: string }[];
  links: {
    type: "EXEC" | "REF";
    targetType: "SECTOR" | "USER";
    sector: { id: string; name: string } | null;
    user: { id: string; name: string } | null;
  }[];
  description: string | null;
}

type InlineMark =
  | { kind: "tag"; start: number; end: number; tag: ReturnType<typeof parseTags>["tags"][number] }
  | { kind: "date"; start: number; end: number; date: ReturnType<typeof parseDates>[number] };

function renderInlineSegments(
  task: TaskDto,
  context: { workId?: string; sectorId?: string },
  showWorkTag: boolean,
  visibleLinks: TaskDto["links"],
) {
  const { tags } = parseTags(task.rawText);
  const dates = parseDates(task.rawText);

  // T014: se mergean tags y fechas en un único array ordenado por posición
  // (mismo enfoque que TagHighlightInput, T013) para que el loop de render
  // procese ambos tipos de marca sin solaparse.
  const marks: InlineMark[] = [
    ...tags.map((tag) => ({ kind: "tag" as const, start: tag.start, end: tag.end, tag })),
    ...dates.map((date) => ({ kind: "date" as const, start: date.start, end: date.end, date })),
  ].sort((a, b) => a.start - b.start);

  const segments: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const mark of marks) {
    if (mark.start < lastEnd) continue; // evita solapamientos

    if (mark.start > lastEnd) {
      // se preservan también los segmentos de solo espacios: así el texto en vista
      // ocupa las mismas posiciones que en el textarea de edición (sin saltos)
      const text = task.rawText.slice(lastEnd, mark.start);
      if (text) segments.push(<span key={`t-${lastEnd}`}>{text}</span>);
    }

    if (mark.kind === "date") {
      const text = task.rawText.slice(mark.start, mark.end);
      segments.push(
        <span key={`date-${mark.start}`} className="date-chip">
          <Calendar size={12} />
          {text}
        </span>,
      );
      lastEnd = mark.end;
      continue;
    }

    const tag = mark.tag;
    const norm = normalizeTagName(tag.name);

    if (tag.symbol === "/") {
      if (showWorkTag && task.work && normalizeTagName(task.work.name) === norm) {
        segments.push(
          <Link key={`tag-${tag.start}`} className="tag tag-work" href={`/works/${task.work.id}`}>
            /{tag.name}
          </Link>,
        );
      }
    } else if (tag.symbol === "#") {
      const link = task.links.find(
        (l) => l.type === "EXEC" && l.targetType === "SECTOR" && l.sector && normalizeTagName(l.sector.name) === norm,
      );
      if (context.sectorId && link?.sector?.id === context.sectorId) {
        // ocultar #sector propio en la vista de ese sector
      } else if (link?.sector) {
        segments.push(
          <Link key={`tag-${tag.start}`} className="tag tag-exec" href={`/sectors/${link.sector.id}`}>
            #{tag.name}
          </Link>,
        );
      } else {
        segments.push(<span key={`tag-${tag.start}`} className="tag tag-exec">#{tag.name}</span>);
      }
    } else if (tag.symbol === "@") {
      const sectorLink = visibleLinks.find(
        (l) => l.type === "REF" && l.targetType === "SECTOR" && l.sector && normalizeTagName(l.sector.name) === norm,
      );
      const userLink = visibleLinks.find(
        (l) => l.targetType === "USER" && l.user && normalizeTagName(l.user.name) === norm,
      );
      if (sectorLink?.sector) {
        segments.push(
          <Link key={`tag-${tag.start}`} className="tag tag-ref" href={`/sectors/${sectorLink.sector.id}`}>
            @{tag.name}
          </Link>,
        );
      } else {
        segments.push(
          <span key={`tag-${tag.start}`} className="tag tag-user">
            @{tag.name}
          </span>,
        );
      }
    } else if (tag.symbol === "$") {
      // T008: el tag $valor resuelto se muestra como chip con el color del LabelValue
      // asignado a la tarea (mismo estilo --c + color-chip que LabelPicker), matcheando
      // por nombre de valor (normalizado, igual que los otros símbolos).
      const label = task.labels.find((l) => normalizeTagName(l.valueName) === norm);
      if (label) {
        segments.push(
          <span
            key={`tag-${tag.start}`}
            className="label-chip color-chip"
            style={{ "--c": label.color } as React.CSSProperties}
            title={`${label.keyName}: ${label.valueName}`}
          >
            {label.valueName}
          </span>,
        );
      } else {
        segments.push(<span key={`tag-${tag.start}`} className="tag tag-label">${tag.name}</span>);
      }
    }

    lastEnd = mark.end;
  }

  if (lastEnd < task.rawText.length) {
    const text = task.rawText.slice(lastEnd);
    if (text) segments.push(<span key={`t-${lastEnd}`}>{text}</span>);
  }

  return segments;
}

/**
 * Render de una tarea con etiquetas contextuales (FR-039): se omite la etiqueta
 * de la vista actual; cada etiqueta navega a su vista (FR-014).
 */
export function TaskItem({
  task,
  context,
  canToggle,
  onChanged,
  variant = "list",
}: {
  task: TaskDto;
  context: { workId?: string; sectorId?: string };
  canToggle: boolean;
  onChanged: () => void;
  /** "board": la columna ya indica el estado — sin selector, solo un menú para mover a otra. */
  variant?: "list" | "board";
}) {
  const [editing, setEditing] = useState(false);
  const [focusTarget, setFocusTarget] = useState<"name" | "description">("name");
  const descRef = useRef<HTMLTextAreaElement>(null);
  const nameSaveRef = useRef<(() => void) | null>(null);

  // FR-402/FR-403: la propiedad de edición depende del origen/adopción de la tarea
  // y de la vista (proyecto siempre puede; sector solo si es de origen sector y no adoptada).
  // Una tarea completada (tachada) no se edita: hay que destildarla primero.
  const canEditText =
    canToggle &&
    task.status.type !== "FINAL" &&
    canEditTaskText(
      { originType: task.originType, adoptedAt: task.adoptedAt },
      context.workId ? "work" : "sector",
    );

  const changeStatus = async (statusId: string) => {
    try {
      await api(`/api/tasks/${task.id}/status`, {
        method: "POST",
        body: JSON.stringify({ statusId }),
      });
      onChanged();
    } catch (err) {
      showToast({ message: (err as Error).message });
    }
  };

  /**
   * Casilla de acceso rápido (además del selector de estado): marca el estado
   * final directo, o vuelve al primer estado "en curso" del conjunto si ya
   * estaba terminada — sin tener que abrir el selector.
   */
  const quickToggleFinal = async () => {
    const target =
      task.status.type === "FINAL"
        ? task.statusOptions.find((s) => s.type === "IN_PROGRESS")
        : task.statusOptions.find((s) => s.type === "FINAL");
    if (target) void changeStatus(target.id);
  };

  const remove = async () => {
    const ok = await showConfirm("¿Eliminar esta tarea?", {
      title: "Eliminar tarea",
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await api(`/api/tasks/${task.id}`, { method: "DELETE" });
    onChanged();
  };

  const handleDescriptionChange = async (value: string) => {
    if (value === (task.description ?? "")) return;
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: value || null }),
      });
      onChanged();
    } catch (err) {
      showToast({ message: (err as Error).message });
    }
  };

  useEffect(() => {
    if (editing && focusTarget === "description") {
      descRef.current?.focus();
    }
  }, [editing, focusTarget]);

  // altura inicial del textarea de detalle = altura del contenido (1 línea si está vacío),
  // para que la transición vista→edición no cambie el alto del bloque
  useEffect(() => {
    if (!editing) return;
    const el = descRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [editing]);

  const handleTextClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if ((e.target as HTMLElement).closest("a")) return;
    if (!canEditText) return;
    setFocusTarget("name");
    setEditing(true);
  };

  const handleDescriptionClick = () => {
    if (!canEditText) return;
    setFocusTarget("description");
    setEditing(true);
  };

  // FR-306: si el guardado direccionó la tarea a otro proyecto, avisar con enlace.
  // Al salir de la edición se guardan AMBOS campos: el nombre (ya guardado por
  // TaskInlineEdit) y el detalle (leído acá del textarea antes de desmontar).
  const handleSaved = (updated: TaskDto) => {
    const descValue = descRef.current?.value;
    if (descValue !== undefined) void handleDescriptionChange(descValue);
    setEditing(false);
    onChanged();
    if (updated.workId && updated.workId !== context.workId) {
      showToast({
        message: `Tarea enviada a /${updated.work?.name ?? "otro proyecto"}`,
        href: updated.work ? `/works/${updated.work.id}` : undefined,
        linkLabel: "Ver",
      });
    }
  };

  /** Salida sin PATCH de nombre: guarda el detalle salvo que sea un descarte (Escape). */
  const handleCancel = (discard?: boolean) => {
    if (!discard) {
      const descValue = descRef.current?.value;
      if (descValue !== undefined) void handleDescriptionChange(descValue);
    }
    setEditing(false);
  };

  // FR-039: en la vista del trabajo se muestran # y @; en la del sector, /trabajo y @
  const showWorkTag = !!(task.work && task.work.id !== context.workId);
  const visibleLinks = task.links.filter(
    (l) => !(l.targetType === "SECTOR" && l.sector?.id === context.sectorId),
  );

  const hasDescription = !!(task.description && task.description.trim());

  return (
    <div className={`task ${task.status.type === "FINAL" ? "done" : ""} ${hasDescription || editing ? "task-with-description" : ""}`}>
      <div className="task-row">
        {/* Casilla de acceso rápido (feature 042): permanece visible durante la
            edición, sin salto de altura de fila. En el tablero no se muestra: los
            3 puntos ya cubren el cambio de estado (columna = estado). */}
        {canToggle && variant === "list" ? (
          <input
            type="checkbox"
            checked={task.status.type === "FINAL"}
            onChange={() => void quickToggleFinal()}
            title={task.status.type === "FINAL" ? "Marcar como no terminada" : "Marcar como terminada"}
            aria-label={task.status.type === "FINAL" ? "Marcar como no terminada" : "Marcar como terminada"}
          />
        ) : !canToggle ? (
          <span className="muted" title="Se completa en su sector de ejecución">
            ◇
          </span>
        ) : null}
        {editing ? (
          <>
            {/* FR-404: en vista sector, el proyecto queda fijo (chip no editable) fuera del texto en edición. */}
            {context.sectorId && task.work && (
              <span className="tag tag-work" title="Proyecto (fijo, se cambia desde el proyecto)">
                /{task.work.name}
              </span>
            )}
            <TaskInlineEdit
              task={task}
              context={context}
              description={task.description}
              onDescriptionChange={(v) => void handleDescriptionChange(v)}
              descriptionRef={descRef}
              skipAutoFocus={focusTarget === "description"}
              saveRef={nameSaveRef}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          </>
        ) : (
          <span
            className="task-text"
            style={{ flex: 1, cursor: canEditText ? "text" : "default" }}
            onClick={handleTextClick}
          >
            {context.sectorId && task.work && !parseTags(task.rawText).tags.some(
              (t) => t.symbol === "/" && normalizeTagName(t.name) === normalizeTagName(task.work!.name),
            ) && (
              <Link className="tag tag-work" href={`/works/${task.work.id}`}>
                /{task.work.name}
              </Link>
            )}
            {renderInlineSegments(task, context, showWorkTag, visibleLinks)}
          </span>
        )}
        {/* Selector de estado: solo si hay más de 2 estados en el conjunto (si son
            solo Pendiente/Hecha, la casilla ya alcanza). En el tablero la columna ya
            indica el estado — ahí se ofrece un menú para mover a otro en vez de selector. */}
        {canToggle && variant === "list" && task.statusOptions.length > 2 && (
          <span className="task-status-pill" style={{ "--c": task.status.color } as React.CSSProperties}>
            <select
              className="task-status-pill-select"
              value={task.status.id}
              onChange={(e) => void changeStatus(e.target.value)}
              aria-label={`Estado de "${task.displayText}"`}
            >
              {task.statusOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </span>
        )}
        {canToggle && variant === "board" && task.statusOptions.length > 1 && (
          <Menu
            label={`Cambiar estado de "${task.displayText}"`}
            items={task.statusOptions
              .filter((s) => s.id !== task.status.id)
              .map((s) => ({
                label: s.name,
                icon: (
                  <span className="entity-color-dot" style={{ background: s.color }} aria-hidden="true" />
                ),
                onSelect: () => void changeStatus(s.id),
              }))}
          />
        )}
        {canToggle && (
          <button
            className="icon-btn"
            style={{ width: 28, height: 28, visibility: editing ? "hidden" : "visible" }}
            onClick={() => void remove()}
            aria-label="Eliminar tarea"
            tabIndex={editing ? -1 : 0}
          >
            <X size={15} />
          </button>
        )}
      </div>
      {editing && (
        <textarea
          ref={descRef}
          className="task-edit-description"
          defaultValue={task.description ?? ""}
          placeholder="Descripción"
          rows={1}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          onBlur={(e) => {
            // el foco volvió al campo de nombre (Tab/clic dentro de la tarea): seguir editando
            const related = e.relatedTarget as HTMLElement | null;
            if (related && related.closest(".task") === e.currentTarget.closest(".task")) return;
            // el foco salió de la tarea: guardar nombre + detalle y cerrar
            // (el guardado del nombre dispara handleSaved, que lee este textarea)
            if (nameSaveRef.current) nameSaveRef.current();
            else {
              void handleDescriptionChange(e.target.value);
              setEditing(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab" && e.shiftKey) {
              e.preventDefault();
              const nameInput = e.currentTarget.closest(".task")?.querySelector<HTMLTextAreaElement>(".task-edit-input");
              nameInput?.focus();
            } else if (e.key === "Enter" && !e.shiftKey) {
              // Enter guarda ambos campos y cierra (Shift+Enter inserta salto de línea)
              e.preventDefault();
              if (nameSaveRef.current) nameSaveRef.current();
              else {
                void handleDescriptionChange(e.currentTarget.value);
                setEditing(false);
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
        />
      )}
      {hasDescription && !editing && (
        <div className="task-description-panel">
          <div
            className="task-description-readonly"
            style={{ cursor: canEditText ? "pointer" : "default" }}
            onClick={handleDescriptionClick}
          >
            {task.description}
          </div>
        </div>
      )}
    </div>
  );
}
