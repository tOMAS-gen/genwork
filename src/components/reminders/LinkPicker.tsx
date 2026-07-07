"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import type { ReminderLinkKind } from "@/lib/domain/reminders/types";

interface Option {
  id: string;
  name: string;
}

export interface LinkValue {
  linkType: ReminderLinkKind | null;
  linkId: string | null;
}

/**
 * Vínculo opcional a un proyecto o sector (FR-002). Las tareas también se pueden
 * vincular a nivel API, pero el picker ofrece los contenedores navegables.
 */
export function LinkPicker({ value, onChange }: { value: LinkValue; onChange: (v: LinkValue) => void }) {
  const [works, setWorks] = useState<Option[]>([]);
  const [sectors, setSectors] = useState<Option[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [w, s] = await Promise.all([
          api<Option[]>("/api/works").catch(() => []),
          api<Option[]>("/api/sectors").catch(() => []),
        ]);
        setWorks(Array.isArray(w) ? w.map((x) => ({ id: x.id, name: x.name })) : []);
        setSectors(Array.isArray(s) ? s.map((x) => ({ id: x.id, name: x.name })) : []);
      } catch {
        /* sin vínculos disponibles */
      }
    })();
  }, []);

  const options = value.linkType === "WORK" ? works : value.linkType === "SECTOR" ? sectors : [];

  return (
    <div className="dialog-field rem-form-section">
      <label>Vínculo (opcional)</label>
      <div className="rem-link-row">
        <select
          value={value.linkType ?? ""}
          onChange={(e) =>
            onChange({ linkType: (e.target.value || null) as ReminderLinkKind | null, linkId: null })
          }
          aria-label="Tipo de vínculo"
        >
          <option value="">Sin vínculo</option>
          <option value="WORK">Proyecto</option>
          <option value="SECTOR">Sector</option>
        </select>
        {value.linkType && (
          <select
            value={value.linkId ?? ""}
            onChange={(e) => onChange({ ...value, linkId: e.target.value || null })}
            className="rem-link-target"
            aria-label={value.linkType === "WORK" ? "Proyecto" : "Sector"}
          >
            <option value="">Elegí…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
