"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/useApi";
import { parseTags } from "@/lib/domain/tags/parser";
import { useTagAutocomplete, type Suggestion } from "./useTagAutocomplete";
import { TagHighlightInput } from "./TagHighlightInput";
import type { TaskDto } from "./TaskItem";

/**
 * Quita la(s) etiqueta(s) `/proyecto` de un rawText, colapsando espacios (FR-404):
 * en la vista de sector el proyecto queda fijo y no se muestra como texto editable.
 */
function stripWorkTag(rawText: string): string {
  const { tags } = parseTags(rawText);
  const workTags = tags.filter((t) => t.symbol === "/");
  if (workTags.length === 0) return rawText;
  let result = "";
  let last = 0;
  for (const t of workTags) {
    result += rawText.slice(last, t.start);
    last = t.end;
  }
  result += rawText.slice(last);
  return result.replace(/\s+/g, " ").trim();
}

/**
 * Edición inline de una tarea existente, estilo Notion (FR-301..FR-304, R2 de 004).
 * Mismo patrón de autocompletado `/#@` y panel "crear o corregir" que TaskListEditor,
 * pero guarda con PATCH (el backend re-parsea) en vez de crear.
 * Enter (sin sugerencias abiertas) o blur guardan; Escape cancela sin guardar;
 * texto vacío o sin cambios respecto del texto inicial tampoco guarda (FR-302).
 * En contexto sector (FR-404), el `/proyecto` no se muestra en el texto editable
 * (queda fijo como chip aparte, ver TaskItem) y el PATCH envía `editContext` para
 * que el servidor aplique la regla de propiedad (R2 de 005).
 */
export function TaskInlineEdit({
  task,
  context,
  description,
  onDescriptionChange,
  descriptionRef,
  skipAutoFocus,
  saveRef,
  onSaved,
  onCancel,
}: {
  task: TaskDto;
  context: { workId?: string; sectorId?: string };
  description: string | null;
  onDescriptionChange: (value: string) => void;
  descriptionRef?: React.RefObject<HTMLTextAreaElement | null>;
  skipAutoFocus?: boolean;
  /** Permite al llamador (TaskItem) disparar el guardado del nombre, p. ej. al salir el foco desde el detalle. */
  saveRef?: React.MutableRefObject<(() => void) | null>;
  onSaved: (updated: TaskDto) => void;
  /** discard=true → Escape: salir sin guardar nada (tampoco el detalle). */
  onCancel: (discard?: boolean) => void;
}) {
  const editContext: "work" | "sector" = context.workId ? "work" : "sector";
  const initialText = editContext === "sector" ? stripWorkTag(task.rawText) : task.rawText;
  const userNames = new Set(
    task.links.filter((l) => l.targetType === "USER" && l.user).map((l) => l.user!.name),
  );
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<{ symbol: string; name: string }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // evita doble-guardado: Enter/Escape marcan la edición como resuelta antes de que
  // llegue el blur consecuente (el input pierde foco al desmontarse o al tocar Escape)
  const finishedRef = useRef(false);
  const { suggestions, activeTag, onTextChange, pick: pickSuggestion, clear } = useTagAutocomplete({
    context,
  });

  useEffect(() => {
    if (skipAutoFocus) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [skipAutoFocus]);

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

  const save = async () => {
    const raw = text.trim();
    // vacío no se guarda (FR-302) y sin cambios no amerita PATCH: se sale de la edición
    // sin descartar — el llamador todavía guarda el detalle si cambió
    if (!raw || raw === initialText) {
      onCancel(false);
      return;
    }
    try {
      const updated = await api<TaskDto>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ rawText: raw, editContext }),
      });
      setUnresolved([]);
      // el aviso "Tarea enviada a /X" lo dispara el llamador (TaskItem) en onSaved,
      // que conoce el contexto de la vista — acá no, para no duplicar toasts
      onSaved(updated);
    } catch (err) {
      const body = (err as { body?: { error?: { unresolvedTags?: { symbol: string; name: string }[] } } })
        .body;
      if (body?.error?.unresolvedTags) {
        // etiquetas sin resolver: se queda en edición mostrando el panel "crear o corregir"
        setUnresolved(body.error.unresolvedTags);
      } else {
        setError((err as Error).message);
      }
    }
  };

  /** FR-303: crea el proyecto/sector inexistente en el ámbito del contexto y reintenta el guardado. */
  const createMissing = async (tag: { symbol: string; name: string }) => {
    try {
      const endpoint = tag.symbol === "/" ? "/api/works" : "/api/sectors";
      // el destino nuevo se crea en el ámbito del contexto actual
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
      await save();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (finishedRef.current) return; // Enter/Escape ya resolvieron esta edición
    if (unresolved.length > 0) return; // panel "crear o corregir" visible: el blur no cancela ni guarda
    // el foco se movió dentro de la misma tarea (p. ej. al textarea de detalle con Tab o clic):
    // la edición sigue abierta — recién se guarda cuando el foco sale de ambos campos
    const related = e.relatedTarget as HTMLElement | null;
    if (related && related.closest(".task") === e.currentTarget.closest(".task")) return;
    finishedRef.current = true;
    void save();
  };

  // expone el guardado para que TaskItem lo dispare cuando el foco sale desde el detalle
  useEffect(() => {
    if (!saveRef) return;
    saveRef.current = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      void save();
    };
    return () => {
      saveRef.current = null;
    };
  });

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <TagHighlightInput
        ref={inputRef}
        className="task-edit-input"
        value={text}
        userNames={userNames}
        multiline
        onChange={(e) => void onChange(e.target.value, e.target.selectionStart ?? 0)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter" && suggestions.length > 0) {
            e.preventDefault();
            pick(suggestions[0]);
          } else if (e.key === "Enter") {
            e.preventDefault();
            finishedRef.current = true;
            void save();
          } else if (e.key === "Tab" && suggestions.length === 0 && !e.shiftKey) {
            e.preventDefault();
            descriptionRef?.current?.focus();
          } else if (e.key === "Escape") {
            e.preventDefault();
            finishedRef.current = true;
            clear();
            onCancel(true);
          }
        }}
      />

      {suggestions.length > 0 && (
        <div
          className="card"
          style={{ position: "absolute", zIndex: 10, marginTop: 4, padding: 6, minWidth: 260 }}
        >
          {suggestions.map((s) => (
            <div
              key={`${s.type}-${s.id}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              style={{ padding: "6px 8px", cursor: "pointer" }}
            >
              <span
                className={`tag ${s.type === "work" ? "tag-work" : s.type === "user" ? "tag-user" : "tag-exec"}`}
              >
                {activeTag?.symbol}
                {s.name}
              </span>{" "}
              <span className="muted">{s.type === "work" ? "proyecto" : s.type}</span>
            </div>
          ))}
        </div>
      )}

      {unresolved.length > 0 && (
        <div className="card" style={{ marginTop: 8, padding: 10 }}>
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
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
