"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Suggestion } from "./useTagAutocomplete";

/**
 * Panel de sugerencias de autocompletado `/ # @ $` (feature 001 + R2 de 004), compartido
 * por TaskListEditor y TaskInlineEdit. Renderiza en portal y se posiciona con el
 * `DOMRect` del input ancla, para no cortarse por el `overflow` de un ancestro (mismo
 * problema que ya se había resuelto para SlashMenu.tsx, ver esa nota).
 */
export function TagSuggestionsMenu({
  anchorEl,
  suggestions,
  selectedIndex,
  activeSymbol,
  emptyMessage,
  onPick,
}: {
  anchorEl: HTMLElement | null;
  suggestions: Suggestion[];
  selectedIndex: number;
  activeSymbol?: string;
  emptyMessage?: string;
  onPick: (s: Suggestion) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Recalcula el rect en cada render (el ancla puede moverse por scroll/resize entre
  // apariciones del menú); es liviano y evita listeners extra para un panel de vida corta.
  // Bail-out manual a la MISMA referencia previa cuando los valores no cambiaron: sin esto,
  // getBoundingClientRect() siempre devuelve un DOMRect nuevo (nunca Object.is-igual al
  // anterior aunque tenga los mismos valores), así que este efecto sin deps re-dispara un
  // render en cada commit sin parar ("Maximum update depth exceeded").
  useLayoutEffect(() => {
    const next = anchorEl?.getBoundingClientRect() ?? null;
    setRect((prev) => {
      if (
        prev === next ||
        (prev &&
          next &&
          prev.x === next.x &&
          prev.y === next.y &&
          prev.width === next.width &&
          prev.height === next.height)
      ) {
        return prev;
      }
      return next;
    });
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!rect || !el) return;
    const menuHeight = el.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlacement(spaceBelow < menuHeight + 16 ? "above" : "below");
  }, [rect, suggestions.length]);

  useEffect(() => {
    const active = containerRef.current?.querySelector(".tag-suggestion.active");
    active?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!rect) return null;

  const style: CSSProperties = {
    position: "fixed",
    left: rect.left,
    minWidth: Math.max(rect.width, 260),
    ...(placement === "below" ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
  };

  return createPortal(
    <div ref={containerRef} className="tag-suggestions" style={style} role="listbox">
      {suggestions.length === 0 && emptyMessage && (
        <div className="muted" style={{ padding: "6px 8px" }}>
          {emptyMessage}
        </div>
      )}
      {suggestions.map((s, i) => (
        <div
          key={`${s.type}-${s.id}`}
          role="option"
          aria-selected={i === selectedIndex}
          className={`tag-suggestion${i === selectedIndex ? " active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(s);
          }}
        >
          {s.type === "label" ? (
            <>
              <span
                aria-hidden="true"
                className="project-dot color-dot"
                style={{ "--c": s.color ?? "#6b7280" } as CSSProperties}
              />
              <span>
                {s.keyName}: {s.name}
              </span>
            </>
          ) : (
            <>
              <span className={`tag ${s.type === "work" ? "tag-work" : s.type === "user" ? "tag-user" : "tag-exec"}`}>
                {activeSymbol}
                {s.name}
              </span>{" "}
              <span className="muted">{s.type === "work" ? "proyecto" : s.type}</span>
            </>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}
