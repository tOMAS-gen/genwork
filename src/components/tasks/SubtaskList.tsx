"use client";

import { useRef, useState } from "react";
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
 * Campo de alta de subtarea (Tarea 12): mismos primitivos de edición con
 * autocompletado `#@$` y fechas que el resto de la app (`TagHighlightInput` +
 * `useTagAutocomplete`, compartidos por `TaskListEditor`/`TaskInlineEdit`), en
 * una versión mínima de una sola línea. A diferencia de esos dos, no ofrece el
 * panel de "crear proyecto/sector faltante" (fuera de alcance acá) ni necesita
 * lidiar con `/proyecto`: una subtarea no puede mudarse de proyecto — el
 * backend la rechaza con `SUBTASK_WORK_TAG` — así que alcanza con mostrar el
 * error si el usuario lo escribe igual.
 */
function AddSubtaskInput({
  context,
  onCreate,
  onCancel,
}: {
  context: { workId?: string; sectorId?: string };
  onCreate: (rawText: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
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
    await onTextChange(value, caret);
  };

  const pick = (s: Suggestion) => {
    const caret = inputRef.current?.selectionStart ?? text.length;
    const next = pickSuggestion(s, text, caret);
    setText(next);
    inputRef.current?.focus();
  };

  const submit = () => {
    const raw = text.trim();
    if (!raw) {
      onCancel();
      return;
    }
    onCreate(raw);
  };

  return (
    <div className="notes-row">
      <Plus size={16} className="plus" />
      <TagHighlightInput
        ref={inputRef}
        value={text}
        placeholder="Nueva subtarea…  (#sector  @referencia  $etiqueta)"
        autoFocus
        onChange={(e) => void onChange(e.target.value, e.target.selectionStart ?? 0)}
        onBlur={() => {
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
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            clear();
            onCancel();
          }
        }}
      />
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
    </div>
  );
}

/**
 * Lista de subtareas de una tarea de nivel raíz (Tarea 12): progreso ya se
 * muestra en `TaskItem` junto al título — acá van las hijas (reusando
 * `TaskItem` para cada una, mismo mapper/DTO que el padre), el alta inline y
 * el reorder por drag & drop (mismo patrón que la lista raíz de
 * `works/[id]/page.tsx`, feature 052). Una hija nunca tiene `subtasks` propias
 * (un solo nivel, ver `taskDto.ts`), así que no hay riesgo de recursión.
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
  const subtasks = task.subtasks ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const createSubtask = async (rawText: string) => {
    try {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ rawText, parentId: task.id }),
      });
      setAdding(false);
      onChanged();
    } catch (err) {
      showToast({ message: (err as Error).message });
    }
  };

  const reorder = async (orderedTaskIds: string[]) => {
    try {
      await api(`/api/tasks/${task.id}/subtasks/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedTaskIds }),
      });
    } catch (err) {
      showToast({ message: (err as Error).message });
    } finally {
      // sin estado optimista propio (las hijas son un prop, no estado local):
      // el reorder final —éxito o 409 TASK_SET_CHANGED— siempre se refleja
      // refrescando desde el padre, igual que revierte works/[id]/page.tsx.
      onChanged();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subtasks.findIndex((t) => t.id === active.id);
    const newIndex = subtasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    void reorder(arrayMove(subtasks, oldIndex, newIndex).map((t) => t.id));
  };

  if (subtasks.length === 0 && !adding && !canToggle) return null;

  return (
    <div className="subtask-list">
      {subtasks.length > 0 && (
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
      )}
      {canToggle &&
        (adding ? (
          <AddSubtaskInput
            context={context}
            onCreate={(rawText) => void createSubtask(rawText)}
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
