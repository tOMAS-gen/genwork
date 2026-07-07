"use client";

import type { EveryUnit, RecurrenceType } from "@/lib/domain/reminders/types";

export interface RecurrenceState {
  recurrenceType: RecurrenceType;
  weekdays: number[];
  everyN: number | null;
  everyUnit: EveryUnit | null;
  endMode: "never" | "date" | "count";
  untilDate: string | null;
  maxOccurrences: number | null;
}

const TYPES: { value: RecurrenceType; label: string }[] = [
  { value: "ONCE", label: "Una vez" },
  { value: "DAILY", label: "Diario" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensual" },
  { value: "YEARLY", label: "Anual" },
  { value: "EVERY_N", label: "Cada N…" },
];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]; // 0..6

/** Editor de recurrencia (FR-004/004a): tipo, multi-día, cada N, y fin opcional. */
export function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceState;
  onChange: (v: RecurrenceState) => void;
}) {
  const set = (patch: Partial<RecurrenceState>) => onChange({ ...value, ...patch });

  const toggleWeekday = (d: number) => {
    const has = value.weekdays.includes(d);
    set({ weekdays: has ? value.weekdays.filter((x) => x !== d) : [...value.weekdays, d].sort((a, b) => a - b) });
  };

  return (
    <div className="dialog-field rem-form-section">
      <label>Repetición</label>
      <select
        value={value.recurrenceType}
        onChange={(e) => set({ recurrenceType: e.target.value as RecurrenceType })}
        className="rem-select-compact"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {value.recurrenceType === "WEEKLY" && (
        <div className="rem-weekday-group" role="group" aria-label="Días de la semana">
          {WEEKDAYS.map((w, d) => (
            <button
              type="button"
              key={d}
              className="rem-weekday-btn"
              aria-pressed={value.weekdays.includes(d)}
              onClick={() => toggleWeekday(d)}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {value.recurrenceType === "EVERY_N" && (
        <div className="rem-inline-row">
          <span className="rem-inline-label">Cada</span>
          <input
            type="number"
            min={1}
            value={value.everyN ?? 1}
            onChange={(e) => set({ everyN: Math.max(1, Number(e.target.value)) })}
            className="rem-narrow-input"
            aria-label="Intervalo"
          />
          <select
            value={value.everyUnit ?? "WEEK"}
            onChange={(e) => set({ everyUnit: e.target.value as EveryUnit })}
            aria-label="Unidad de intervalo"
            className="rem-flex"
          >
            <option value="DAY">días</option>
            <option value="WEEK">semanas</option>
            <option value="MONTH">meses</option>
          </select>
        </div>
      )}

      {value.recurrenceType !== "ONCE" && (
        <div className="rem-end-block">
          <label className="rem-inline-label">Finaliza</label>
          <div className="rem-end-row">
            <select
              value={value.endMode}
              onChange={(e) => set({ endMode: e.target.value as RecurrenceState["endMode"] })}
              aria-label="Modo de finalización"
            >
              <option value="never">Nunca</option>
              <option value="date">En una fecha</option>
              <option value="count">Tras N veces</option>
            </select>
            {value.endMode === "date" && (
              <input
                type="date"
                value={value.untilDate ?? ""}
                onChange={(e) => set({ untilDate: e.target.value || null })}
                aria-label="Fecha de finalización"
              />
            )}
            {value.endMode === "count" && (
              <input
                type="number"
                min={1}
                value={value.maxOccurrences ?? 1}
                onChange={(e) => set({ maxOccurrences: Math.max(1, Number(e.target.value)) })}
                className="rem-narrow-input-lg"
                aria-label="Cantidad de ocurrencias"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
