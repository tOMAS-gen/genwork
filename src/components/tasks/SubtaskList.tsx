"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/components/ui/useApi";
import { showToast } from "@/components/ui/Toast";
import { Plus } from "@/components/ui/icons";
import { useTagAutocomplete, type Suggestion } from "./useTagAutocomplete";
import { TagSuggestionsMenu } from "./TagSuggestionsMenu";
import { TagHighlightInput } from "./TagHighlightInput";
import { TaskItem, type TaskDto } from "./TaskItem";

/** Progreso "hechas/total" de las hijas de una tarea; null cuando no tiene subtareas (Tarea 12). */
export function subtaskProgressLabel(task: { subtaskDone: number; subtaskCount: number }): string | null {
  if (task.subtaskCount === 0) return null;
  return `${task.subtaskDone}/${task.subtaskCount}`;
}

/**
 * El check de acceso rápido (y cualquier otro camino al estado FINAL) solo se
 * habilita si no quedan hijas abiertas — evita el 409 PARENT_HAS_OPEN_SUBTASKS
 * que ya devuelve el backend, en vez de depender de ese error (Tarea 12).
 */
export function canFinishParent(task: { subtaskDone: number; subtaskCount: number }): boolean {
  return task.subtaskDone === task.subtaskCount;
}

/**
 * Texto de la confirmación de borrado (revisión final, hallazgo Crítico): si la
 * tarea tiene subtareas, avisa cuántas se van con ella — el cascade de la FK las
 * borra y no hay vuelta atrás.
 */
export function deleteConfirmMessage(task: { subtaskCount?: number }): string {
  const count = task.subtaskCount ?? 0;
  if (count === 0) return "¿Eliminar esta tarea?";
  return count === 1
    ? "¿Eliminar esta tarea? También se elimina su subtarea."
    : `¿Eliminar esta tarea? También se eliminan sus ${count} subtareas.`;
}

/**
 * El arrastre sólo se ofrece cuando la página ve TODAS las hijas (revisión
 * final, hallazgo Importante): el reorder manda la lista completa y el servidor
 * la compara contra todas las hijas del padre, así que en una vista donde falta
 * alguna (una hija delegada a otro sector, por ejemplo) cada arrastre fallaría
 * con "el orden cambió mientras reordenabas", que además sería mentira.
 */
export function canReorderSubtasks(task: { subtasks?: unknown[]; subtaskCount?: number }): boolean {
  const visible = task.subtasks?.length ?? 0;
  return visible === (task.subtaskCount ?? visible);
}

/** Migaja de la tarjeta de una subtarea en el tablero (Tarea 13): de qué tarea cuelga. */
export function parentBreadcrumb(task: { parentId: string | null; parentText: string | null }): string | null {
  return task.parentId && task.parentText ? `↳ ${task.parentText}` : null;
}

/**
 * Texto del ítem de menú para reorganizar la jerarquía (Tarea 13): una tarea
 * raíz se puede colgar de otra; una subtarea se puede sacar de la suya. Los
 * dos casos son mutuamente excluyentes (una tarea o es raíz o es hija, nunca
 * las dos), así que un solo ítem alcanza por tarea.
 */
export function reparentMenuLabel(task: { parentId: string | null; parentText: string | null }): string {
  if (task.parentId) return `Sacar de "${task.parentText ?? "su tarea padre"}"`;
  return "Mover bajo otra tarea…";
}

/**
 * Fila arrastrable de una subtarea: mismo patrón que `SortableTaskRow` de
 * `works/[id]/page.tsx` (feature 052, T005/T006) — el handle visual y el estilo
 * de "arrastrando" viven en TaskItem, acá solo se conecta `useSortable`.
 */
function SortableSubtaskRow({
  task,
  context,
  canToggle,
  onChanged,
}: {
  task: TaskDto;
  context: { workId?: string; sectorId?: string; suppressWorkTag?: boolean };
  canToggle: boolean;
  onChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "none" }}
    >
      <TaskItem
        task={task}
        context={context}
        canToggle={canToggle}
        onChanged={onChanged}
        dragHandleProps={{ attributes, listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

/**
 * Campo de alta de subtarea (Tarea 12, revisión — hallazgo Importante 3):
 * mismos primitivos de edición con autocompletado `#@$` y fechas que el resto
 * de la app (`TagHighlightInput` + `useTagAutocomplete`, compartidos por
 * `TaskListEditor`/`TaskInlineEdit`) Y el mismo panel "crear lo que falta"
 * (`unresolved`/`createMissing`, copiado de esos dos componentes: la paridad
 * pedida por el brief es funcional, no solo visual). Único faltante a
 * propósito: no hace falta lidiar con `/proyecto` — una subtarea no puede
 * mudarse de proyecto (el backend la rechaza con `SUBTASK_WORK_TAG` antes de
 * llegar a `unresolvedTags`), así que ese símbolo nunca aparece acá.
 */
function AddSubtaskInput({
  parentId,
  context,
  onCreated,
  onCancel,
}: {
  parentId: string;
  context: { workId?: string; sectorId?: string };
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [unresolved, setUnresolved] = useState<{ symbol: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    suggestions,
    activeTag,
    selectedIndex,
    onTextChange,
    pick: pickSuggestion,
    moveSelection,
    clear,
  } = useTagAutocomplete({ context });

  const onChange = async (value: string, caret: number) => {
    setText(value);
    setError(null);
    setUnresolved([]);
    await onTextChange(value, caret);
  };

  const pick = (s: Suggestion) => {
    const caret = inputRef.current?.selectionStart ?? text.length;
    const next = pickSuggestion(s, text, caret);
    setText(next);
    inputRef.current?.focus();
  };

  const submit = async () => {
    const raw = text.trim();
    if (!raw) {
      onCancel();
      return;
    }
    try {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ rawText: raw, parentId }),
      });
      setText("");
      setUnresolved([]);
      onCreated();
    } catch (err) {
      const body = (err as { body?: { error?: { unresolvedTags?: { symbol: string; name: string }[] } } })
        .body;
      if (body?.error?.unresolvedTags) setUnresolved(body.error.unresolvedTags);
      else setError((err as Error).message);
    }
  };

  /** Copiado de TaskInlineEdit/TaskListEditor: crea el sector faltante y reintenta el alta. */
  const createMissing = async (tag: { symbol: string; name: string }) => {
    try {
      const endpoint = tag.symbol === "/" ? "/api/works" : "/api/sectors";
      let groupId: string | null = null;
      if (context.workId) {
        const work = await api<{ groupId: string | null }>(`/api/works/${context.workId}`);
        groupId = work.groupId;
      } else if (context.sectorId) {
        const sectors = await api<{ id: string; groupId: string | null }[]>("/api/sectors");
        groupId = sectors.find((s) => s.id === context.sectorId)?.groupId ?? null;
      }
      await api(endpoint, { method: "POST", body: JSON.stringify({ name: tag.name, groupId }) });
      setUnresolved((prev) => prev.filter((t) => t.name !== tag.name));
      await submit();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Estructura idéntica a TaskListEditor/TaskInlineEdit: `.notes-row` (flex)
  // envuelve SOLO el ícono + el input; el panel de sugerencias, el de "crear
  // lo que falta" y el error van AFUERA como hermanos de `.notes-row`, no
  // adentro — si quedaran adentro, el `display:flex` de `.notes-row` los
  // metería como columnas en la misma fila en vez de apilarlos debajo.
  return (
    <div>
      <div className="notes-row">
        <Plus size={16} className="plus" />
        <TagHighlightInput
          ref={inputRef}
          value={text}
          placeholder="Nueva subtarea…  (#sector  @referencia  $etiqueta)"
          autoFocus
          onChange={(e) => void onChange(e.target.value, e.target.selectionStart ?? 0)}
          onBlur={() => {
            if (unresolved.length > 0) return; // panel "crear lo que falta" visible: el blur no cancela
            if (!text.trim()) onCancel();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && suggestions.length > 0) {
              e.preventDefault();
              moveSelection(1);
            } else if (e.key === "ArrowUp" && suggestions.length > 0) {
              e.preventDefault();
              moveSelection(-1);
            } else if (e.key === "Enter" && suggestions.length > 0) {
              e.preventDefault();
              pick(suggestions[selectedIndex]);
            } else if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              clear();
              onCancel();
            }
          }}
        />
      </div>
      {(suggestions.length > 0 || (activeTag?.symbol === "$" && suggestions.length === 0)) && (
        <TagSuggestionsMenu
          anchorEl={inputRef.current}
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          activeSymbol={activeTag?.symbol}
          emptyMessage={activeTag?.symbol === "$" ? "No hay etiquetas disponibles" : undefined}
          onPick={pick}
        />
      )}
      {unresolved.length > 0 && (
        <div className="card" style={{ marginTop: 8, padding: 10 }} aria-live="polite">
          {unresolved.map((tag) => (
            <div key={tag.symbol + tag.name} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>
                <strong>
                  {tag.symbol}
                  {tag.name}
                </strong>{" "}
                no existe todavía.
              </span>
              <button className="btn" onClick={() => void createMissing(tag)}>
                Crear {tag.symbol === "/" ? "proyecto" : "sector"}
              </button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Lista de subtareas de una tarea de nivel raíz (Tarea 12): progreso ya se
 * muestra en `TaskItem` junto al título — acá van las hijas (reusando
 * `TaskItem` para cada una, mismo mapper/DTO que el padre), el alta inline y
 * el reorder por drag & drop, optimista (revisión — ruling del controlador:
 * mismo patrón que la lista raíz de `works/[id]/page.tsx`, feature 052, en vez
 * de esperar el refresco del servidor para ver el nuevo orden). Una hija
 * nunca tiene `subtasks` propias (un solo nivel, ver `taskDto.ts`), así que no
 * hay riesgo de recursión.
 */
export function SubtaskList({
  task,
  context,
  canToggle,
  onChanged,
}: {
  task: TaskDto;
  context: { workId?: string; sectorId?: string; suppressWorkTag?: boolean };
  canToggle: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  // Estado optimista propio (revisión — hallazgo Menor/ruling): `task.subtasks`
  // es un prop, así que se copia a estado local para poder mostrar el nuevo
  // orden ANTES de que responda el PATCH, y se resincroniza cada vez que el
  // padre entrega un array de hijas nuevo (después de un refetch real).
  const [subtasks, setSubtasks] = useState<TaskDto[]>(task.subtasks ?? []);
  // Sólo se puede reordenar si esta vista ve todas las hijas (ver canReorderSubtasks).
  const reorderable = canReorderSubtasks(task);
  useEffect(() => {
    setSubtasks(task.subtasks ?? []);
  }, [task.subtasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * PATCH + reconciliación optimista, mismo contrato que `commitReorder` de
   * `works/[id]/page.tsx`: si el servidor confirma, se refresca igual (la
   * fuente de verdad son los conteos/orden reales); si falla, se revierte al
   * orden previo y, en el 409 TASK_SET_CHANGED puntual, además se refresca.
   */
  const commitReorder = (reordered: TaskDto[], previousSubtasks: TaskDto[]) => {
    void api(`/api/tasks/${task.id}/subtasks/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ orderedTaskIds: reordered.map((t) => t.id) }),
    })
      .then(() => {
        onChanged();
      })
      .catch((err) => {
        setSubtasks(previousSubtasks);
        const status = (err as { status?: number }).status;
        if (status === 409) {
          showToast({ message: "El orden cambió mientras se reordenaba; se actualizó la lista" });
          onChanged();
        } else {
          showToast({ message: (err as Error).message });
        }
      });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subtasks.findIndex((t) => t.id === active.id);
    const newIndex = subtasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const previousSubtasks = subtasks;
    const reordered = arrayMove(subtasks, oldIndex, newIndex);
    setSubtasks(reordered);
    commitReorder(reordered, previousSubtasks);
  };

  if (subtasks.length === 0 && !adding && !canToggle) return null;

  return (
    <div className="subtask-list">
      {/* Revisión — hallazgo Importante 1: el drag solo se ofrece si `canToggle`
          (mismo patrón ramificado que works/[id]/page.tsx:401-420) — en modo
          solo-lectura (sector en modo vista, proyecto no activo) las hijas se
          listan planas, sin handle ni DndContext, igual que hace esa página
          con la lista raíz cuando `editable` es false. */}
      {subtasks.length > 0 &&
        (canToggle && reorderable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={subtasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {subtasks.map((child) => (
                <SortableSubtaskRow
                  key={child.id}
                  task={child}
                  context={context}
                  canToggle={canToggle}
                  onChanged={onChanged}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          subtasks.map((child) => (
            <TaskItem key={child.id} task={child} context={context} canToggle={canToggle} onChanged={onChanged} />
          ))
        ))}
      {canToggle &&
        (adding ? (
          <AddSubtaskInput
            parentId={task.id}
            context={context}
            onCreated={() => {
              setAdding(false);
              onChanged();
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button type="button" className="subtask-add" onClick={() => setAdding(true)}>
            <Plus size={14} /> Subtarea
          </button>
        ))}
    </div>
  );
}
