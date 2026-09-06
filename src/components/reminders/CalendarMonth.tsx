"use client";

import { ChevronLeft, ChevronRight } from "@/components/ui/icons";

export interface Occurrence {
  reminderId: string;
  date: string; // ISO (medianoche UTC del día)
  title: string;
  scope: string;
}

const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const SCOPE_LABEL: Record<string, string> = {
  INDIVIDUAL: "Individual",
  GROUP: "De grupo",
  GLOBAL: "Global",
};

const dayKey = (iso: string) => iso.slice(0, 10);
const cellKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Grilla mensual tipo Google Calendar (FR-013/014). Semana inicia lunes.
 * Muestra la zona horaria activa (FR-029) y una leyenda de alcances (el color no
 * es el único codificador: cada pill lleva title y hay leyenda). Presentacional.
 */
export function CalendarMonth({
  year,
  month, // 0..11
  occurrences,
  timezone,
  todayKey,
  onPrev,
  onNext,
  onToday,
  onDayClick,
  onOccurrenceClick,
  loading = false,
}: {
  year: number;
  month: number;
  occurrences: Occurrence[];
  timezone: string;
  todayKey: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDayClick: (dateOnly: string) => void;
  onOccurrenceClick: (reminderId: string) => void;
  loading?: boolean;
}) {
  const byDay = new Map<string, Occurrence[]>();
  for (const o of loading ? [] : occurrences) {
    const k = dayKey(o.date);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(o);
  }

  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // 0=lun
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="reminders-calendar">
      <div className="rem-cal-head">
        <div className="rem-cal-title-group">
          <h2 className="calendar-month-title">
            {MONTHS[month]} {year}
          </h2>
          <span className="rem-month-count" role="status">
            {loading
              ? "Cargando…"
              : `${occurrences.length} recordatorio${occurrences.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="rem-cal-nav" role="group" aria-label="Navegación del calendario">
          <button type="button" className="icon-btn" onClick={onPrev} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={onToday}>
            Hoy
          </button>
          <button type="button" className="icon-btn" onClick={onNext} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <p className="rem-calendar-scroll-hint">Deslizá para ver todos los días.</p>
      <div
        className="rem-calendar-scroll"
        tabIndex={0}
        role="region"
        aria-label="Calendario mensual"
      >
        <div
          className="rem-grid"
          aria-busy={loading}
          role="grid"
          aria-label={`Calendario de ${MONTHS[month]} ${year}`}
        >
          <div role="row" className="rem-week-row">
            {WEEK.map((w) => (
              <div key={w} className="rem-dow" role="columnheader">
                {w}
              </div>
            ))}
          </div>
          {Array.from({ length: cells.length / 7 }, (_, week) => (
            <div role="row" className="rem-week-row" key={week}>
              {cells.slice(week * 7, week * 7 + 7).map((d, dayIndex) => {
                const i = week * 7 + dayIndex;
                if (d === null)
                  return (
                    <div
                      key={i}
                      className="rem-day is-outside"
                      role="gridcell"
                      aria-hidden="true"
                    />
                  );
                const key = cellKey(year, month, d);
                const items = byDay.get(key) ?? [];
                const isToday = key === todayKey;
                return (
                  <div
                    key={i}
                    role="gridcell"
                    tabIndex={0}
                    aria-label={`${d} — ${items.length} recordatorio${items.length === 1 ? "" : "s"}`}
                    className={`rem-day${isToday ? " is-today" : ""}`}
                    onClick={() => onDayClick(key)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onDayClick(key);
                      }
                    }}
                  >
                    <span className="rem-day-num">{d}</span>
                    <div className="rem-day-events">
                      {items.map((o, j) => (
                        <button
                          key={`${o.reminderId}-${j}`}
                          type="button"
                          className={`rem-pill rem-scope-${o.scope}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOccurrenceClick(o.reminderId);
                          }}
                          title={`${o.title} · ${SCOPE_LABEL[o.scope] ?? o.scope}`}
                        >
                          {o.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="rem-cal-footer">
        <div className="rem-legend" aria-label="Alcances de los recordatorios">
          {(["INDIVIDUAL", "GROUP", "GLOBAL"] as const).map((s) => (
            <span className="rem-legend-item" key={s}>
              <span className={`rem-legend-dot rem-scope-${s}`} />
              {SCOPE_LABEL[s]}
            </span>
          ))}
        </div>
        <span className="rem-tz" title="Zona horaria del sistema">
          {timezone.replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
}
