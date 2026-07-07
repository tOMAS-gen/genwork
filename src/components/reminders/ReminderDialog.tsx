"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import type { Lead, ReminderInput, ReminderScope } from "@/lib/domain/reminders/types";
import { LeadsEditor } from "./LeadsEditor";
import { RecurrenceEditor, type RecurrenceState } from "./RecurrenceEditor";
import { LinkPicker, type LinkValue } from "./LinkPicker";

export interface ReminderDto {
  id: string;
  title: string;
  description: string | null;
  scope: ReminderScope;
  groupId: string | null;
  date: string;
  recurrenceType: RecurrenceState["recurrenceType"];
  weekdays: number[];
  everyN: number | null;
  everyUnit: RecurrenceState["everyUnit"];
  untilDate: string | null;
  maxOccurrences: number | null;
  linkType: LinkValue["linkType"];
  linkId: string | null;
  leads: Lead[];
}

interface GroupOption {
  id: string;
  name: string;
}

const isoDateOnly = (d: string) => new Date(d).toISOString().slice(0, 10);
const toIso = (dateOnly: string) => `${dateOnly}T00:00:00.000Z`;
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Crear/editar recordatorio (FR-001..006). El alcance disponible depende del rol:
 * individual siempre; grupo si el usuario tiene grupos; global solo SUPERADMIN.
 */
export function ReminderDialog({
  open,
  onClose,
  onSaved,
  isSuperAdmin,
  existing,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  isSuperAdmin: boolean;
  existing?: ReminderDto | null;
  defaultDate?: string | null;
}) {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayIso());
  const [scope, setScope] = useState<ReminderScope>("INDIVIDUAL");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [link, setLink] = useState<LinkValue>({ linkType: null, linkId: null });
  const [leads, setLeads] = useState<Lead[]>([{ daysBefore: 0, minuteOfDay: 9 * 60 }]);
  const [rec, setRec] = useState<RecurrenceState>({
    recurrenceType: "ONCE",
    weekdays: [],
    everyN: 1,
    everyUnit: "WEEK",
    endMode: "never",
    untilDate: null,
    maxOccurrences: null,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void api<GroupOption[]>("/api/groups")
      .then((g) => setGroups(g.map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => setGroups([]));
  }, [open]);

  // Prefill al abrir (edición o valores por defecto).
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setDate(isoDateOnly(existing.date));
      setScope(existing.scope);
      setGroupId(existing.groupId);
      setLink({ linkType: existing.linkType, linkId: existing.linkId });
      setLeads(existing.leads.length ? existing.leads : [{ daysBefore: 0, minuteOfDay: 9 * 60 }]);
      setRec({
        recurrenceType: existing.recurrenceType,
        weekdays: existing.weekdays,
        everyN: existing.everyN ?? 1,
        everyUnit: existing.everyUnit ?? "WEEK",
        endMode: existing.untilDate ? "date" : existing.maxOccurrences ? "count" : "never",
        untilDate: existing.untilDate ? isoDateOnly(existing.untilDate) : null,
        maxOccurrences: existing.maxOccurrences,
      });
    } else {
      setTitle("");
      setDescription("");
      setDate(defaultDate ?? todayIso());
      setScope("INDIVIDUAL");
      setGroupId(null);
      setLink({ linkType: null, linkId: null });
      setLeads([{ daysBefore: 0, minuteOfDay: 9 * 60 }]);
      setRec({ recurrenceType: "ONCE", weekdays: [], everyN: 1, everyUnit: "WEEK", endMode: "never", untilDate: null, maxOccurrences: null });
    }
    setError("");
  }, [open, existing, defaultDate]);

  const save = async () => {
    if (!title.trim()) {
      setError("Poné un nombre a la alerta");
      return;
    }
    if (scope === "GROUP" && !groupId) {
      setError("Elegí un grupo");
      return;
    }
    if ((link.linkType && !link.linkId) || (!link.linkType && link.linkId)) {
      setError("Completá el vínculo o dejalo vacío");
      return;
    }

    const payload: ReminderInput = {
      title: title.trim(),
      description: description.trim() || null,
      scope,
      groupId: scope === "GROUP" ? groupId : null,
      date: toIso(date),
      recurrenceType: rec.recurrenceType,
      weekdays: rec.recurrenceType === "WEEKLY" ? rec.weekdays : [],
      everyN: rec.recurrenceType === "EVERY_N" ? rec.everyN : null,
      everyUnit: rec.recurrenceType === "EVERY_N" ? rec.everyUnit : null,
      untilDate: rec.endMode === "date" && rec.untilDate ? toIso(rec.untilDate) : null,
      maxOccurrences: rec.endMode === "count" ? rec.maxOccurrences : null,
      linkType: link.linkType,
      linkId: link.linkId,
      leads,
    };

    setSaving(true);
    setError("");
    try {
      if (existing) {
        await api(`/api/reminders/${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/reminders", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={existing ? "Editar recordatorio" : "Nuevo recordatorio"}>
      <div className="dialog-field">
        <label htmlFor="rem-title">Nombre</label>
        <input
          id="rem-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej.: Vencimiento factura Tina"
        />
      </div>

      <div className="dialog-field">
        <label htmlFor="rem-desc">Descripción</label>
        <textarea
          id="rem-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="De qué es…"
          rows={2}
        />
      </div>

      {!existing ? (
        <div className="rem-row-2col">
          <div className="dialog-field">
            <label htmlFor="rem-date">Fecha</label>
            <input id="rem-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="dialog-field">
            <label htmlFor="rem-scope">Alcance</label>
            <select id="rem-scope" value={scope} onChange={(e) => setScope(e.target.value as ReminderScope)}>
              <option value="INDIVIDUAL">Solo para mí</option>
              {groups.length > 0 && <option value="GROUP">De grupo</option>}
              {isSuperAdmin && <option value="GLOBAL">Global (todos)</option>}
            </select>
          </div>
        </div>
      ) : (
        <div className="dialog-field">
          <label htmlFor="rem-date">Fecha</label>
          <input id="rem-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      )}

      {!existing && scope === "GROUP" && (
        <div className="dialog-field">
          <select
            value={groupId ?? ""}
            onChange={(e) => setGroupId(e.target.value || null)}
            className="rem-sub-select"
            aria-label="Grupo"
          >
            <option value="">Elegí un grupo…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <RecurrenceEditor value={rec} onChange={setRec} />
      <LeadsEditor leads={leads} onChange={setLeads} />
      <LinkPicker value={link} onChange={setLink} />

      {error && <p className="rem-error">{error}</p>}

      <div className="dialog-actions">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? "Guardando…" : existing ? "Guardar" : "Crear"}
        </button>
      </div>
    </Dialog>
  );
}
