"use client";

import { useRef, useState } from "react";
import { Plus } from "@/components/ui/icons";
import { api } from "@/components/ui/useApi";
import { splitTaskLines } from "@/lib/domain/tasks/multiline";

interface Suggestion {
  id: string;
  name: string;
  type: "work" | "sector" | "user";
}

/**
 * Bloc de notas de tareas (FR-105): escribir + Enter crea la tarea y el foco sigue
 * en la línea para la siguiente. Autocompletado inline `/` `#` `@` (feature 001);
 * pegar multilínea crea una tarea por línea no vacía (splitTaskLines).
 */
export function TaskListEditor({
  context,
  onCreated,
}: {
  context: { workId?: string; sectorId?: string };
  onCreated: () => void;
}) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeTag, setActiveTag] = useState<{ symbol: string; start: number } | null>(null);
  const [unresolved, setUnresolved] = useState<{ symbol: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const contextQuery = context.workId
    ? `contextWorkId=${context.workId}`
    : context.sectorId
      ? `contextSectorId=${context.sectorId}`
      : "";

  const createOne = async (rawText: string) => {
    await api("/api/tasks", {
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
    const before = value.slice(0, caret);
    const match = /(^|\s)([/#@])([\p{L}\p{N}_\-.]*)$/u.exec(before);
    if (match) {
      const symbol = match[2];
      const query = match[3];
      setActiveTag({ symbol, start: caret - query.length });
      const results = await api<Suggestion[]>(
        `/api/tags/suggest?symbol=${encodeURIComponent(symbol)}&q=${encodeURIComponent(query)}&${contextQuery}`,
      ).catch(() => []);
      setSuggestions(results);
    } else {
      setActiveTag(null);
      setSuggestions([]);
    }
  };

  const pick = (s: Suggestion) => {
    if (!activeTag) return;
    const caret = inputRef.current?.selectionStart ?? text.length;
    const next = text.slice(0, activeTag.start) + s.name + " " + text.slice(caret);
    setText(next);
    setActiveTag(null);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const submit = async () => {
    const raw = text.trim();
    if (!raw) return;
    try {
      await createOne(raw);
      setText("");
      setUnresolved([]);
      onCreated();
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
      for (const line of lines) await createOne(line);
      setText("");
      onCreated();
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
        <input
          ref={inputRef}
          placeholder="Escribí una tarea y Enter…  (/proyecto  #sector  @referencia)"
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
            } else if (e.key === "Escape") {
              setSuggestions([]);
            }
          }}
        />
      </div>

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
                className={`tag ${s.type === "work" ? "tag-work" : s.type === "user" ? "tag-ref" : "tag-exec"}`}
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
