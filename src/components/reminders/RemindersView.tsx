"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { Plus } from "@/components/ui/icons";
import { CalendarMonth, type Occurrence } from "./CalendarMonth";
import { ReminderDialog, type ReminderDto } from "./ReminderDialog";

const monthRange = (year: number, month: number) => ({
  from: new Date(Date.UTC(year, month, 1)).toISOString(),
  to: new Date(Date.UTC(year, month + 1, 0)).toISOString(),
});

function todayKeyInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(),
    );
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Vista principal de recordatorios: calendario mensual + creación/edición (FR-013). */
export function RemindersView({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  usePageTitle("Recordatorios");
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReminderDto | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { from, to } = monthRange(year, month);
    try {
      const res = await api<{ occurrences: Occurrence[] }>(
        `/api/reminders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setOccurrences(res.occurrences);
    } catch {
      setOccurrences([]);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void api<{ timezone: string }>("/api/reminders/timezone")
      .then((r) => setTimezone(r.timezone))
      .catch(() => {});
  }, []);

  const shift = (delta: number) => {
    const total = year * 12 + month + delta;
    setYear(Math.floor(total / 12));
    setMonth(((total % 12) + 12) % 12);
  };
  const prev = () => shift(-1);
  const next = () => shift(1);
  const goToday = () => {
    setYear(now.getUTCFullYear());
    setMonth(now.getUTCMonth());
  };

  const openNew = (date?: string) => {
    setEditing(null);
    // Sin día elegido → "hoy" en la zona del sistema (evita off-by-one con UTC).
    setDefaultDate(date ?? todayKeyInTz(timezone));
    setDialogOpen(true);
  };

  const openEdit = async (reminderId: string) => {
    try {
      const res = await api<{ reminder: ReminderDto; canMutate: boolean }>(`/api/reminders/${reminderId}`);
      setEditing(res.reminder);
      setDefaultDate(null);
      setDialogOpen(true);
    } catch {
      /* no visible */
    }
  };

  return (
    <div className="sheet">
      <CalendarMonth
        headerSlot={
          <button className="btn btn-primary" onClick={() => openNew()}>
            <Plus size={15} /> Nuevo
          </button>
        }
        year={year}
        month={month}
        occurrences={occurrences}
        timezone={timezone}
        todayKey={todayKeyInTz(timezone)}
        onPrev={prev}
        onNext={next}
        onToday={goToday}
        onDayClick={(d) => openNew(d)}
        onOccurrenceClick={(id) => void openEdit(id)}
      />

      <ReminderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void load()}
        isSuperAdmin={isSuperAdmin}
        existing={editing}
        defaultDate={defaultDate}
      />
    </div>
  );
}
