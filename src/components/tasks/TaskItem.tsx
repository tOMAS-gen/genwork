"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { api } from "@/components/ui/useApi";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { X, Calendar, GripVertical, Plus } from "@/components/ui/icons";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { canEditTaskText } from "@/lib/domain/tasks/ownership";
import { shouldShowAutoWorkTag } from "@/lib/domain/tasks/workTagVisibility";
import { parseTags, normalizeTagName } from "@/lib/domain/tags/parser";
import { parseDates } from "@/lib/domain/dates/parser";
import { effectiveDueDate } from "@/lib/domain/tasks/parentDueDate";
import { TaskInlineEdit } from "./TaskInlineEdit";
import {
  SubtaskList,
  subtaskProgressLabel,
  canFinishParent,
  reparentMenuLabel,
  deleteConfirmMessage,
} from "./SubtaskList";
import { TaskMoveDialog } from "./TaskMoveDialog";

/** 062-subtareas: fecha heredada de una hija — corto, sin año (mismo criterio que StatusBar/DueDateBadge). */
const inheritedDueDateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" });

export interface TaskDto {
  id: string;
  /** Texto crudo (con etiquetas /#@) — lo usa la edición inline (T008, R2 de 004). */
  rawText: string;
  displayText: string;
  status: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  /** Conjunto de estados aplicable a esta tarea (feature 042, FR-011). */
  statusOptions: { id: string; name: string; color: string; type: "IN_PROGRESS" | "FINAL"; sortOrder: number }[];
  workId: string | null;
  work: { id: string; name: string; status?: string; group?: { id: string; name: string } | null } | null;
  /** Origen de la tarea y, si fue adoptada por el proyecto, cuándo (FR-401). */
  originType: "WORK" | "SECTOR";
  adoptedAt: string | null;
  homeSector: { id: string; name: string; group?: { id: string; name: string } | null } | null;
  /** Etiquetas de proyecto asignadas a la tarea (feature 032): una por clave. */
  labels: { keyId: string; keyName: string; valueId: string; valueName: string; color: string }[];
  links: {
    type: "EXEC" | "REF";
    targetType: "SECTOR" | "USER";
    sector: { id: string; name: string; group?: { id: string; name: string } | null } | null;
    user: { id: string; name: string } | null;
  }[];
  description: string | null;
  /** Per-task completion eligibility (feature 057): true when the user operates a relevant REF sector. */
  canToggle?: boolean;
  /**
   * 062-subtareas: total/hechas de hijas (GLOBAL, no solo lo visible en esta
   * vista). `subtaskCount > 0` marca a la tarea como contenedora — su propio
   * `status` es un espejo del de sus hijas y no debe sumar a un contador de
   * progreso por separado (ver src/lib/domain/tasks/unfinishedCount.ts). El
   * render anidado de las hijas queda para las Tareas 12/13; acá solo viajan
   * los conteos porque works/[id]/route.ts ya los expone.
   */
  subtaskCount?: number;
  subtaskDone?: number;
  /** 062-subtareas (Tarea 12): id de la tarea padre — null/undefined en una tarea de nivel raíz. */
  parentId?: string | null;
  /** 062-subtareas: texto de la tarea padre (migaja "tarea de: …"); no se usa todavía en la Tarea 12. */
  parentText?: string | null;
  /** 062-subtareas: fecha propia de la tarea (Task 3); la mostrada puede heredarse de una hija abierta. */
  dueDate?: string | null;
  /** 062-subtareas (Tarea 12): hijas anidadas, serializadas con el MISMO mapper que el padre. */
  subtasks?: TaskDto[];
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
  dragHandleProps,
  isDragging = false,
}: {
  task: TaskDto;
  context: { workId?: string; sectorId?: string; suppressWorkTag?: boolean };
  canToggle: boolean;
  onChanged: () => void;
  /** "board": la columna ya indica el estado — sin selector, solo un menú para mover a otra. */
  variant?: "list" | "board";
  /**
   * Feature 052 (T006): `attributes`/`listeners` de `useSortable` (dnd-kit), pasados
   * por el `SortableTaskRow` de `works/[id]/page.tsx` (T005). Si no vienen (lista
   * de solo lectura, tablero, u otros usos de `TaskItem`), no se muestra el handle.
   */
  dragHandleProps?: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };
  /** Feature 052 (T006): true mientras esta tarea se está arrastrando — aplica el estilo de elevación. */
  isDragging?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  // Abre el campo de alta de subtarea desde el botón + de esta fila (062-subtareas).
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [focusTarget, setFocusTarget] = useState<"name" | "description">("name");
  const [moveOpen, setMoveOpen] = useState(false);
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
    // 062-subtareas (revisión final, hallazgo Crítico): borrar un padre se lleva
    // sus hijas por cascade de la FK. La confirmación tiene que decir cuántas,
    // porque es pérdida irreversible con un clic.
    const ok = await showConfirm(deleteConfirmMessage(task), {
      title: "Eliminar tarea",
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await api(`/api/tasks/${task.id}`, { method: "DELETE" });
    onChanged();
  };

  /**
   * "Sacar de …" (062-subtareas, Tarea 13): promueve la subtarea a raíz en el
   * acto, sin diálogo — es el caso simétrico de "Mover bajo otra tarea…", que
   * sí necesita elegir destino. Mismo canal de error que el resto de las
   * acciones de esta fila (showToast); el backend ya valida todo lo demás.
   */
  const takeOutOfParent = async () => {
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ parentId: null }) });
      onChanged();
    } catch (err) {
      showToast({ message: (err as Error).message });
    }
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
  /**
   * ¿Esta fila muestra la lista de subtareas debajo? Solo en la lista (el tablero
   * agrupa por estado) y solo en tareas raíz. Se calcula una vez porque manda dos
   * cosas que tienen que ir juntas: montar `SubtaskList` y apilar `.task` en
   * columna. Sin lo segundo, `.task` sigue siendo un flex en fila y las hijas se
   * dibujan al costado derecho del padre en vez de debajo — que es exactamente lo
   * que pasaba cuando la tarea no estaba en edición ni tenía descripción, los dos
   * únicos casos que hasta ahora activaban el layout de columna.
   */
  const showsSubtasks = variant === "list" && !task.parentId && (canToggle || (task.subtasks?.length ?? 0) > 0);

  // 062-subtareas (Tarea 12): progreso de hijas + gate de "se puede finalizar" —
  // siempre con los conteos GLOBALES del DTO (subtaskCount/subtaskDone), nunca
  // con el largo de `task.subtasks` (que puede no venir, o venir vacío en vistas
  // que todavía no anidan hijas — ver comentario de subtaskCount en TaskDto).
  const subtaskCounts = { subtaskDone: task.subtaskDone ?? 0, subtaskCount: task.subtaskCount ?? 0 };
  const progressLabel = subtaskProgressLabel(subtaskCounts);
  const finishable = canFinishParent(subtaskCounts);
  /**
   * ¿Esta tarea es un contenedor? (062-subtareas). Con hijas, su estado lo
   * gobiernan ellas: no lleva casilla ni selector de estado propio, sólo el
   * progreso. Mostrar controles de estado que el backend va a rechazar (409
   * PARENT_HAS_OPEN_SUBTASKS) es ofrecer algo que no se puede hacer.
   */
  const isContainer = subtaskCounts.subtaskCount > 0;
  // Revisión (hallazgo Importante 2): el motivo del bloqueo tiene que poder
  // anunciarse (aria-label + title), no solo verse — se arma una vez acá para
  // no duplicar la cadena entre los dos atributos que la usan más abajo.
  const checkboxLabel = !finishable
    ? "Faltan " + (subtaskCounts.subtaskCount - subtaskCounts.subtaskDone) + " subtareas"
    : task.status.type === "FINAL"
      ? "Marcar como no terminada"
      : "Marcar como terminada";
  // 062-subtareas (Tarea 13): reorganizar la jerarquía desde el menú — colgar
  // una tarea raíz de otra ("Mover bajo otra tarea…") o sacar una subtarea de
  // la suya ("Sacar de …"). Mismo permiso base que el resto de las acciones de
  // esta fila (canToggle) — es una operación de estructura, no de texto, así
  // que no depende de canEditText (eso es FR-402/403, sobre el rawText).
  const reparentTask = { parentId: task.parentId ?? null, parentText: task.parentText ?? null };
  const reparentItems: MenuItem[] = canToggle
    ? [
        {
          label: reparentMenuLabel(reparentTask),
          onSelect: () => (reparentTask.parentId ? void takeOutOfParent() : setMoveOpen(true)),
        },
      ]
    : [];
  // Vencimiento heredado (Task 3): si la tarea no tiene fecha propia, hereda la
  // más próxima de una hija ABIERTA. El caso "fecha propia" ya se ve inline en
  // el rawText vía date-chip (renderInlineSegments) — acá solo hace falta
  // pintar algo cuando NO hay date-chip propio y la fecha viene prestada.
  const effectiveDue = effectiveDueDate({
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    subtasks: (task.subtasks ?? []).map((s) => ({
      dueDate: s.dueDate ? new Date(s.dueDate) : null,
      status: { type: s.status.type },
    })),
  });

  return (
    <>
    <div
      className={`task ${task.status.type === "FINAL" ? "done" : ""} ${hasDescription || editing || showsSubtasks ? "task-with-description" : ""} ${variant === "list" && dragHandleProps ? "task-has-handle" : ""} ${isDragging ? "task-dragging" : ""}`}
    >
      <div className="task-row">
        {/* Drag handle (feature 052, T006): solo en variant "list" y cuando el
            padre (SortableTaskRow) pasa attributes/listeners de useSortable —
            así el arrastre se activa desde este ícono, no desde toda la fila. */}
        {variant === "list" && dragHandleProps && (
          <button
            type="button"
            className="task-drag-handle"
            aria-label={`Arrastrar para reordenar "${task.displayText}"`}
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical size={15} />
          </button>
        )}
        {/* Casilla de acceso rápido (feature 042): permanece visible durante la
            edición, sin salto de altura de fila. En el tablero no se muestra: los
            3 puntos ya cubren el cambio de estado (columna = estado).
            Una tarea CON subtareas no lleva casilla (062-subtareas): su estado es
            derivado del de sus hijas, así que ofrecer un control que no se puede
            usar —y explicar por qué— es peor que no mostrarlo. En su lugar queda
            el progreso "1/3", que es la información real de esa fila. */}
        {isContainer ? null : canToggle && variant === "list" ? (
          <input
            type="checkbox"
            checked={task.status.type === "FINAL"}
            // Revisión (hallazgo Importante 2): `disabled` nativo saca el control
            // del orden de tabulación — quien navega con teclado nunca llegaría a
            // escuchar el motivo. `aria-disabled` lo anuncia sin sacarlo del
            // recorrido; el bloqueo real del toggle lo hace `onClick` (cubre mouse
            // Y la barra espaciadora, que en un checkbox dispara "click" también),
            // con `onChange` como resguardo adicional. Mismo patrón de capas que
            // ya usa Menu.tsx (disabled + aria-disabled), pero sin el `disabled`
            // nativo porque acá SÍ hace falta que siga siendo alcanzable por Tab.
            aria-disabled={!finishable}
            onClick={(e) => {
              if (!finishable) e.preventDefault();
            }}
            onChange={() => {
              if (finishable) void quickToggleFinal();
            }}
            title={checkboxLabel}
            aria-label={checkboxLabel}
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
          <>
            <span
              className="task-text"
              style={{ flex: 1, cursor: canEditText ? "text" : "default" }}
              onClick={handleTextClick}
            >
              {shouldShowAutoWorkTag(task, context) && task.work && (
                <Link className="tag tag-work" href={`/works/${task.work.id}`}>
                  /{task.work.name}
                </Link>
              )}
              {renderInlineSegments(task, context, showWorkTag, visibleLinks)}
            </span>
            {/* 062-subtareas (Tarea 12): progreso "hechas/total" junto al título — solo
                cuando la tarea es contenedora (subtaskCount > 0). */}
            {progressLabel && (
              <span
                className="badge badge-sm"
                title={`${subtaskCounts.subtaskDone}/${subtaskCounts.subtaskCount} subtareas hechas`}
              >
                {progressLabel}
              </span>
            )}
            {/* Vencimiento heredado (Task 3): la fecha PROPIA ya se ve inline en el texto
                (date-chip de renderInlineSegments) — este badge atenuado solo aparece
                cuando la tarea no tiene fecha propia y la toma prestada de una hija. */}
            {effectiveDue?.inherited && (
              <span className="date-chip date-chip-inherited" title="Vence por una subtarea">
                <Calendar size={12} />
                {inheritedDueDateFormatter.format(effectiveDue.date)}
              </span>
            )}
          </>
        )}
        {/* Agregar subtarea (062-subtareas): sólo el ícono, sin texto al lado — el
            carril de controles de la fila ya es angosto y la acción se explica
            sola con el `aria-label`. Se revela al pasar el mouse por la fila o al
            enfocarla (`.task-add-subtask`, en globals.css), así una lista larga no
            se llena de botones compitiendo por atención. */}
        {showsSubtasks && canToggle && (
          <button
            type="button"
            className="icon-btn task-add-subtask"
            style={{ width: 28, height: 28, visibility: editing ? "hidden" : "visible" }}
            onClick={() => setAddingSubtask(true)}
            aria-label={`Agregar subtarea a "${task.displayText}"`}
            title="Agregar subtarea"
            tabIndex={editing ? -1 : 0}
          >
            <Plus size={15} />
          </button>
        )}
        {/* Selector de estado: solo si hay más de 2 estados en el conjunto (si son
            solo Pendiente/Hecha, la casilla ya alcanza). En el tablero la columna ya
            indica el estado — ahí se ofrece un menú para mover a otro en vez de selector. */}
        {canToggle && variant === "list" && !isContainer && task.statusOptions.length > 2 && (
          <span className="task-status-pill" style={{ "--c": task.status.color } as React.CSSProperties}>
            <select
              className="task-status-pill-select"
              value={task.status.id}
              onChange={(e) => void changeStatus(e.target.value)}
              aria-label={`Estado de "${task.displayText}"`}
            >
              {task.statusOptions.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  disabled={s.type === "FINAL" && !finishable}
                  title={s.type === "FINAL" && !finishable ? "Faltan subtareas por terminar" : undefined}
                >
                  {s.name}
                </option>
              ))}
            </select>
          </span>
        )}
        {/* 062-subtareas (Tarea 13, revisión — ruling del controlador): "mover
            bajo otra tarea"/"sacar de..." tiene que poder alcanzarse también en
            "list" — es donde se trabaja habitualmente (proyecto/sector/referencias),
            no solo desde el tablero. Acá no hay Menu de cambio de estado (ya
            está el <select> de arriba) así que este ⋮ es nuevo y trae SOLO
            reparent, sin duplicar el cambio de estado. */}
        {canToggle && variant === "list" && reparentItems.length > 0 && (
          <Menu label={`Reorganizar "${task.displayText}"`} items={reparentItems} />
        )}
        {/* 062-subtareas (Tarea 13): el mismo menú de "cambiar estado" (variant
            board) suma ahora "Mover bajo otra tarea…"/"Sacar de …" — reusa el
            único ⋮ que ya tiene la tarjeta en vez de agregar un segundo botón. */}
        {canToggle && variant === "board" && (task.statusOptions.length > 1 || reparentItems.length > 0) && (
          <Menu
            label={`Acciones de "${task.displayText}"`}
            items={[
              ...task.statusOptions
                .filter((s) => s.id !== task.status.id)
                .map((s) => ({
                  label: s.name,
                  icon: (
                    <span className="entity-color-dot" style={{ background: s.color }} aria-hidden="true" />
                  ),
                  // 062-subtareas (Tarea 12): mismo gate que el check/select de variant "list" —
                  // no ofrecer el estado FINAL como alcanzable si quedan hijas abiertas.
                  disabled: s.type === "FINAL" && !finishable,
                  onSelect: () => void changeStatus(s.id),
                })),
              ...reparentItems,
            ]}
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
      {/* 062-subtareas (Tarea 12): hijas anidadas — solo en variant "list" (el
          tablero agrupa por estado, no tiene lugar para una lista anidada) y
          solo para tareas de nivel raíz (una subtarea no puede tener las suyas,
          ver taskDto.ts). */}
      {showsSubtasks && (
        <SubtaskList
          task={task}
          context={context}
          canToggle={canToggle}
          onChanged={onChanged}
          adding={addingSubtask}
          onAddingChange={setAddingSubtask}
        />
      )}
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
    {/* 062-subtareas (Tarea 13): mismo patrón que RenameDialog en sectors/[id]/page.tsx
        — se monta siempre, controlado por `open`; el fetch de candidatas queda
        adentro del propio diálogo, gateado por ese mismo `open`. Revisión: ya no
        es peso muerto en "list" — el ⋮ de reparent de esa variante también abre
        este mismo diálogo con `setMoveOpen(true)` (ver reparentItems más arriba). */}
    <TaskMoveDialog
      open={moveOpen}
      onClose={() => setMoveOpen(false)}
      task={task}
      onMoved={onChanged}
    />
    </>
  );
}
