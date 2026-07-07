"use client";

import type { Lead } from "@/lib/domain/reminders/types";
import { Plus, X } from "@/components/ui/icons";

/** minuteOfDay → "HH:MM" y viceversa. */
export function minuteToTime(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}
export function timeToMinute(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

const DAY_PRESETS = [
  { value: 0, label: "Mismo día" },
  { value: 1, label: "1 día antes" },
  { value: 2, label: "2 días antes" },
  { value: 3, label: "3 días antes" },
  { value: 7, label: "1 semana antes" },
];

/**
 * Editor de antelaciones (FR-005): varias por recordatorio, cada una con
 * "N días antes" + hora. Detecta duplicados visualmente.
 */
export function LeadsEditor({ leads, onChange }: { leads: Lead[]; onChange: (l: Lead[]) => void }) {
  const update = (i: number, patch: Partial<Lead>) => {
    onChange(leads.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const add = () => onChange([...leads, { daysBefore: 0, minuteOfDay: 9 * 60 }]);
  const remove = (i: number) => onChange(leads.filter((_, idx) => idx !== i));

  const dupKeys = new Set<string>();
  const isDup = leads.map((l) => {
    const k = `${l.daysBefore}:${l.minuteOfDay}`;
    if (dupKeys.has(k)) return true;
    dupKeys.add(k);
    return false;
  });

  return (
    <div className="dialog-field rem-form-section">
      <label>Avisos (antelaciones)</label>
      <div className="rem-leads-list">
        {leads.map((lead, i) => {
          const preset = DAY_PRESETS.some((p) => p.value === lead.daysBefore);
          return (
            <div key={i} className="rem-lead-row">
              <select
                value={preset ? lead.daysBefore : "custom"}
                onChange={(e) =>
                  update(i, { daysBefore: e.target.value === "custom" ? lead.daysBefore : Number(e.target.value) })
                }
                aria-label={`Antelación del aviso ${i + 1}`}
              >
                {DAY_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">Otro…</option>
              </select>
              {!preset && (
                <input
                  type="number"
                  min={0}
                  value={lead.daysBefore}
                  onChange={(e) => update(i, { daysBefore: Math.max(0, Number(e.target.value)) })}
                  className="rem-narrow-input"
                  aria-label="Días antes"
                />
              )}
              <input
                type="time"
                value={minuteToTime(lead.minuteOfDay)}
                onChange={(e) => update(i, { minuteOfDay: timeToMinute(e.target.value) })}
                className={isDup[i] ? "rem-lead-dup" : undefined}
                aria-label={`Hora del aviso ${i + 1}`}
              />
              {leads.length > 1 && (
                <button type="button" className="btn btn-ghost" onClick={() => remove(i)} aria-label="Quitar aviso">
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn-ghost rem-add-btn" onClick={add}>
        <Plus size={14} /> Agregar aviso
      </button>
    </div>
  );
}
