"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { SlashItem } from "@/lib/domain/editor/slash-items";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ImageIcon,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
} from "@/components/ui/icons";

/** Ícono por ítem del catálogo (mapeo UI, el dominio no conoce React/Lucide). */
const ICONS: Record<string, typeof Type> = {
  text: Type,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  bullet: List,
  image: ImageIcon,
  "numbered-list": ListOrdered,
  "task-list": CheckSquare,
  blockquote: Quote,
  "code-block": Code,
  divider: Minus,
};

export interface SlashMenuHandle {
  /** Reenviado desde slashCommand.ts (onKeyDown de Suggestion). Devuelve true si consumió la tecla. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashMenuProps {
  /** Ítems ya filtrados por query (filterSlashItems corre en slashCommand.ts). */
  items: SlashItem[];
  /** Inserta el bloque elegido (delega en Suggestion → slashCommand → item.run). */
  command: (item: SlashItem) => void;
  /** DOMRect del caret que da Suggestion; null mientras no hay posición conocida. */
  clientRect: (() => DOMRect | null) | null | undefined;
  /** Notifica al renderer (slashCommand.ts) que el menú se cerró por Esc, para ocultar el portal. */
  onClose?: () => void;
}

/**
 * Menú flotante de bloques del editor de documentación (FR-201..206).
 * Renderiza en portal para no cortarse por overflow de la hoja; navegación completa por
 * teclado vía el handle imperativo `onKeyDown` que reenvía slashCommand.ts.
 */
export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command, clientRect, onClose },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");

  // clave estable del conjunto de ítems visibles: resetea el resaltado cuando cambia el filtro
  const itemsKey = items.map((item) => item.id).join(",");
  useEffect(() => {
    setSelectedIndex(0);
  }, [itemsKey]);

  // Al navegar con las flechas, mantené el ítem resaltado dentro del área visible
  // del menú (si tiene scroll por overflow). `block: "nearest"` no salta si ya se ve.
  useEffect(() => {
    const active = containerRef.current?.querySelector(".slash-item.active");
    active?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, itemsKey]);

  // FR-201/edge case: reposiciona hacia arriba si el menú no entra cerca del borde inferior
  useLayoutEffect(() => {
    const rect = clientRect?.();
    const el = containerRef.current;
    if (!rect || !el) return;
    const menuHeight = el.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlacement(spaceBelow < menuHeight + 16 ? "above" : "below");
  }, [clientRect, itemsKey]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown(event: KeyboardEvent): boolean {
        if (event.key === "ArrowDown") {
          if (items.length > 0) {
            setSelectedIndex((i) => (i + 1) % items.length);
          }
          return true;
        }
        if (event.key === "ArrowUp") {
          if (items.length > 0) {
            setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          }
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        if (event.key === "Escape") {
          onClose?.();
          return true;
        }
        return false;
      },
    }),
    [items, selectedIndex, command, onClose],
  );

  const rect = clientRect?.();
  const style: CSSProperties = rect
    ? {
        position: "fixed",
        left: rect.left,
        ...(placement === "below"
          ? { top: rect.bottom + 6 }
          : { bottom: window.innerHeight - rect.top + 6 }),
      }
    : { display: "none" };

  const activeId = items[selectedIndex] ? `slash-item-${items[selectedIndex].id}` : undefined;

  let lastGroup: string | null = null;

  return createPortal(
    <div
      ref={containerRef}
      className="slash-menu"
      style={style}
      role="listbox"
      aria-label="Bloques disponibles"
      aria-activedescendant={activeId}
    >
      {items.length === 0 ? (
        <div className="slash-empty">Sin bloques que coincidan</div>
      ) : (
        items.map((item, index) => {
          const Icon = ICONS[item.id] ?? Type;
          const showGroupHeader = item.group !== lastGroup;
          lastGroup = item.group;
          return (
            <div key={item.id}>
              {showGroupHeader && <div className="slash-group">{item.group}</div>}
              <div
                id={`slash-item-${item.id}`}
                role="option"
                aria-selected={index === selectedIndex}
                className={`slash-item${index === selectedIndex ? " active" : ""}`}
                onMouseDown={(event) => {
                  // evita perder la selección/foco del editor antes de ejecutar el comando
                  event.preventDefault();
                  command(item);
                }}
                onMouseMove={() => setSelectedIndex(index)}
              >
                <Icon size={16} className="slash-item-icon" />
                <span className="slash-item-title">{item.title}</span>
                {item.shortcut && <span className="slash-item-shortcut">{item.shortcut}</span>}
              </div>
            </div>
          );
        })
      )}
    </div>,
    document.body,
  );
});
