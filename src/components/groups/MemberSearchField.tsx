"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/useApi";
import { Search, X } from "@/components/ui/icons";

export interface MemberCandidate {
  id: string;
  name: string;
  email: string;
}

/**
 * Buscador de usuarios para alta de miembros de grupo (US1, FR-001..005/009).
 * Mientras no hay `selected`, muestra un input con debounce que consulta
 * GET /api/groups/[id]/members/search y una lista navegable por teclado
 * (mismo patrón de flechas/Enter/Escape que SlashMenu, sin portal). Al elegir
 * un resultado se delega en `onSelect` y el padre conserva la elección hasta
 * confirmar el alta o llamar `onClear` explícitamente (FR-009).
 */
export function MemberSearchField({
  groupId,
  selected,
  onSelect,
  onClear,
}: {
  groupId: string;
  /** Usuario ya elegido (o null). El padre lo limpia tras confirmar el alta. */
  selected: MemberCandidate | null;
  onSelect: (user: MemberCandidate) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    const timer = setTimeout(() => {
      void api<MemberCandidate[]>(
        `/api/groups/${groupId}/members/search?q=${encodeURIComponent(trimmed)}`,
      )
        .then((data) => {
          if (requestIdRef.current !== requestId) return;
          setResults(data);
          setSearched(true);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setResults([]);
          setSearched(true);
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, groupId]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const pick = (user: MemberCandidate) => {
    setQuery("");
    setResults([]);
    setSearched(false);
    onSelect(user);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length > 0 && event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
      return;
    }
    if (results.length > 0 && event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Enter") {
      const user = results[selectedIndex];
      if (user) {
        event.preventDefault();
        pick(user);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  };

  if (selected) {
    return (
      <div className="member-search-selected">
        <div className="member-search-selected-info">
          <strong>{selected.name}</strong>
          <span className="muted">{selected.email}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Quitar selección"
          onClick={onClear}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  const showDropdown = query.trim().length >= 2;
  const activeId = results[selectedIndex] ? `member-search-option-${results[selectedIndex].id}` : undefined;

  return (
    <div className="member-search" ref={containerRef}>
      <div className="member-search-input label-picker-search">
        <Search size={15} className="label-picker-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nombre o email…"
          aria-label="Buscar usuario"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="member-search-listbox"
          aria-activedescendant={activeId}
        />
      </div>

      {showDropdown && (
        <div className="member-search-dropdown" role="listbox" id="member-search-listbox">
          {loading && (
            <div className="member-search-loading">Buscando…</div>
          )}
          {results.length === 0 && searched && !loading && (
            <div className="member-search-empty">No se encontraron usuarios.</div>
          )}
          {results.map((user, index) => (
            <div
              key={user.id}
              id={`member-search-option-${user.id}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={`member-search-item${index === selectedIndex ? " active" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(user);
              }}
              onMouseMove={() => setSelectedIndex(index)}
            >
              <span className="member-search-item-name">{user.name}</span>
              <span className="member-search-item-email muted">{user.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
