import { Badge } from "@/components/ui/Badge";
import { ChevronRight, Globe, User, Users } from "@/components/ui/icons";
import type { SectorSection } from "@/components/sectors/groupSectorsByScope";

/**
 * Contenido del encabezado de una sección de sectores (feature 060).
 *
 * Devuelve solo el interior del botón, sin elemento contenedor propio: el modo
 * grilla lo envuelve en un `<button>` dentro de un `<section>`, y el modo lista
 * en un `<button>` dentro de un `<th>`. Un acordeón genérico no serviría para
 * los dos porque no se puede intercalar un `<div>` entre `<table>` y `<tr>`.
 *
 * Vocabulario visual tomado de `.nav-group` (drawer): mayúsculas, tracking
 * amplio y color muted, para que se lea como separador y no compita con el
 * `<h1>Sectores</h1>` de la página.
 */

/**
 * Clases del botón que envuelve este contenido. Tailwind corre con
 * `preflight: false`, así que un `<button>` conserva fondo, borde y padding del
 * navegador: hay que neutralizarlos a mano. El outline de foco lo pone la regla
 * global `:focus-visible` de globals.css.
 */
export const SECTION_HEADER_BUTTON_CLASS = "sector-section-toggle";

export function SectorSectionHeader({
  section,
  open,
  color,
}: {
  section: SectorSection;
  open: boolean;
  color?: string | null;
}) {
  const ScopeIcon = section.kind === "GROUP" ? Users : section.kind === "PERSONAL" ? User : Globe;

  return (
    <>
      <ChevronRight
        size={15}
        aria-hidden
        className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      />

      {color ? (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : (
        <ScopeIcon size={15} aria-hidden className="shrink-0 text-muted" />
      )}

      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={section.title}>
        {section.title.toUpperCase()}
      </span>

      <span
        className="shrink-0 font-normal normal-case text-muted"
        title={`${section.count} ${section.count === 1 ? "sector" : "sectores"}`}
      >
        ({section.count})
      </span>

      <Badge
        count={section.pending}
        ariaLabelSingular={`tarea no finalizada en ${section.title}`}
        ariaLabelPlural={`tareas no finalizadas en ${section.title}`}
        className="ml-auto"
      />
    </>
  );
}
