"use client";

import { useRef, useState } from "react";
import { Plus } from "@/components/ui/icons";
import { api } from "@/components/ui/useApi";
import { showToast } from "@/components/ui/Toast";
import { splitTaskLines } from "@/lib/domain/tasks/multiline";
import { useTagAutocomplete, type Suggestion } from "./useTagAutocomplete";
import { TagHighlightInput } from "./TagHighlightInput";
import type { TaskDto } from "./TaskItem";

/**
 * Bloc de notas de tareas (FR-105): escribir + Enter crea la tarea y el foco sigue
 * en la línea para la siguiente. Autocompletado inline `/` `#` `@` vía useTagAutocomplete
 * (feature 001 + R2 de 004); pegar multilínea crea una tarea por línea no vacía
 * (splitTaskLines). Si la tarea creada se direccionó a otro proyecto, avisa con un Toast
 * (R3 de 004).
 */
export function TaskListEditor({
  context,
  onCreated,
}: {
  context: { workId?: string; sectorId?: string };
  onCreated: () => void;
}) {
  const [text, setText] = useState("");
  const [desc, setDesc] = useState("");
  const [unresolved, setUnresolved] = useState<{ symbol: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const { suggestions, activeTag, onTextChange, pick: pickSuggestion, clear } = useTagAutocomplete({
    context,
  });

  /** Avisa si la tarea creada quedó direccionada a un proyecto distinto del contexto actual. */
  const notifyIfMovedAway = (task: TaskDto) => {
    if (task.workId && task.workId !== context.workId) {
      showToast({
        message: `Tarea enviada a /${task.work?.name ?? "otro proyecto"}`,
        href: task.work ? `/works/${task.work.id}` : undefined,
        linkLabel: "Ver",
      });
    }
  };

  const createOne = async (rawText: string): Promise<TaskDto> => {
    return api<TaskDto>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        rawText,
        contextWorkId: context.workId,
        contextSectorId: context.sectorId,
      }),
    });
  };

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
    if (!raw) return;
    try {
      const task = await createOne(raw);
      // el detalle se guarda con un PATCH aparte (el POST solo parsea el rawText)
      const description = desc.trim();
      if (description) {
        await api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ description }),
        });
      }
      setText("");
      setDesc("");
      setUnresolved([]);
      onCreated();
      notifyIfMovedAway(task);
      inputRef.current?.focus(); // bloc de notas: sigue el foco
    } catch (err) {
      const body = (err as { body?: { error?: { unresolvedTags?: { symbol: string; name: string }[] } } })
        .body;
      if (body?.error?.unresolvedTags) setUnresolved(body.error.unresolvedTags);
      else setError((err as Error).message);
    }
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    const lines = splitTaskLines(pasted);
    if (lines.length <= 1) return; // una sola línea: comportamiento normal
    e.preventDefault();
    try {
      let lastMoved: TaskDto | null = null;
      for (const line of lines) {
        const task = await createOne(line);
        if (task.workId && task.workId !== context.workId) lastMoved = task;
      }
      setText("");
      onCreated();
      if (lastMoved) notifyIfMovedAway(lastMoved); // resumen: un solo toast, no spamear
      inputRef.current?.focus();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const createMissing = async (tag: { symbol: string; name: string }) => {
    try {
      const endpoint = tag.symbol === "/" ? "/api/works" : "/api/sectors";
      let groupId: string | null = null;
      if (context.workId) {
        const work = await api<{ groupId: string | null }>(`/api/works/${context.workId}`);
        groupId = work.groupId;
      }
      await api(endpoint, { method: "POST", body: JSON.stringify({ name: tag.name, groupId }) });
      setUnresolved((prev) => prev.filter((t) => t.name !== tag.name));
      await submit();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div className="notes-row">
        <Plus size={16} className="plus" />
        <TagHighlightInput
          ref={inputRef}
          placeholder={context.workId
            ? "Escribí una tarea y Enter…  (#sector  @referencia)"
            : "Escribí una tarea y Enter…  (/proyecto  #sector  @referencia)"
          }
          value={text}
          onChange={(e) => void onChange(e.target.value, e.target.selectionStart ?? 0)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions.length > 0) {
              e.preventDefault();
              pick(suggestions[0]);
            } else if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            } else if (e.key === "Tab" && suggestions.length === 0 && !e.shiftKey && text.trim()) {
              // Tab baja al campo de detalle (visible solo cuando hay texto de tarea)
              e.preventDefault();
              descRef.current?.focus();
            } else if (e.key === "Escape") {
              clear();
            }
          }}
        />
      </div>

      {(text.trim() !== "" || desc !== "") && (
        <textarea
          ref={descRef}
          className="task-edit-description task-create-description"
          value={desc}
          placeholder="Descripción (opcional)"
          rows={1}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              // Enter también crea la tarea desde el detalle (Shift+Enter: salto de línea)
              e.preventDefault();
              void submit();
            } else if (e.key === "Tab" && e.shiftKey) {
              e.preventDefault();
              inputRef.current?.focus();
            } else if (e.key === "Escape") {
              setDesc("");
              inputRef.current?.focus();
            }
          }}
        />
      )}

      {suggestions.length > 0 && (
        <div
          className="card"
          style={{ position: "absolute", zIndex: 10, marginTop: 2, padding: 6, minWidth: 260 }}
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
