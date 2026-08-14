"use client";

import { Calendar } from "@/components/ui/icons";
import { parseTags, normalizeTagName } from "@/lib/domain/tags/parser";
import { parseDates } from "@/lib/domain/dates/parser";
import type { PortalTask } from "./types";

/**
 * Una tarea en el portal de cliente (feature 059, FR-016/FR-017/FR-019).
 *
 * Componente propio y no TaskItem con una bandera de solo lectura: TaskItem gatea
 * cinco afordancias de escritura con un mismo booleano, y de sus casi 500 líneas
 * el portal no usa el editor en línea, el selector de estado, el menú, el arrastre
 * ni la navegación de los chips. Acá no hay ninguna prop de escritura que alguien
 * pueda invertir por error en un refactor futuro: la única forma de que aparezca un
 * control es escribirlo a mano.
 *
 * Reusa las funciones puras del parser y las clases del sistema de diseño
 * (.task, .tag, .label-chip, .date-chip), así que no agrega estilos propios.
 */

const dueDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Reconstruye el texto con sus chips en la posición en que fueron escritos.
 * Los chips van como <span> y no como enlaces: un cliente no navega a la vista
 * interna de un sector.
 */
function renderSegments(task: PortalTask) {
  const { tags } = parseTags(task.rawText);
  const dates = parseDates(task.rawText);
  const marks = [
    ...tags.map((tag) => ({ kind: "tag" as const, start: tag.start, end: tag.end, tag })),
    ...dates.map((date) => ({ kind: "date" as const, start: date.start, end: date.end })),
  ].sort((a, b) => a.start - b.start);

  const segments: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const mark of marks) {
    if (mark.start < lastEnd) continue;
    if (mark.start > lastEnd) {
      const text = task.rawText.slice(lastEnd, mark.start);
      if (text) segments.push(<span key={`t-${lastEnd}`}>{text}</span>);
    }
    lastEnd = mark.end;

    if (mark.kind === "date") {
      segments.push(
        <span key={`date-${mark.start}`} className="date-chip">
          <Calendar size={12} />
          {task.rawText.slice(mark.start, mark.end)}
        </span>,
      );
      continue;
    }

    const { tag } = mark;
    const norm = normalizeTagName(tag.name);

    if (tag.symbol === "/") {
      // El nombre del proyecto ya encabeza la página: repetirlo en cada tarea es ruido.
      continue;
    }

    if (tag.symbol === "$") {
      const label = task.labels.find((l) => normalizeTagName(l.valueName) === norm);
      // Una etiqueta que no resuelve no se pinta: sería un dato interno sin sentido.
      if (label) {
        segments.push(
          <span
            key={`tag-${tag.start}`}
            className="label-chip color-chip"
            style={{ "--c": label.color } as React.CSSProperties}
          >
            {label.valueName}
          </span>,
        );
      }
      continue;
    }

    const link = task.links.find((l) => normalizeTagName(l.name) === norm);
    if (!link) continue;

    const className =
      tag.symbol === "#" ? "tag tag-exec" : link.targetType === "USER" ? "tag tag-user" : "tag tag-ref";
    segments.push(
      <span key={`tag-${tag.start}`} className={className}>
        {tag.symbol}
        {tag.name}
      </span>,
    );
  }

  if (lastEnd < task.rawText.length) {
    const text = task.rawText.slice(lastEnd);
    if (text) segments.push(<span key={`t-${lastEnd}`}>{text}</span>);
  }

  return segments;
}

export function PortalTaskItem({ task }: { task: PortalTask }) {
  const done = task.status.type === "FINAL";
  const due = task.dueDate ? new Date(task.dueDate) : null;

  return (
    <li className={`task portal-task ${done ? "done" : ""}`}>
      <div className="portal-task-main">
        <span className="task-text">{renderSegments(task)}</span>
        {/* El estado se nombra, no se comunica solo por color (Principio V). */}
        <span
          className="label-chip color-chip portal-task-status"
          style={{ "--c": task.status.color } as React.CSSProperties}
        >
          {task.status.name}
        </span>
      </div>

      {task.description && <p className="portal-task-description">{task.description}</p>}

      {due && (
        <p className="portal-task-due">
          <Calendar size={13} aria-hidden="true" />
          Entrega: {dueDateFormatter.format(due)}
        </p>
      )}
    </li>
  );
}
