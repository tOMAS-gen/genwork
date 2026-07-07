"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/components/ui/useApi";
import { Bell, Clock, X } from "@/components/ui/icons";

interface DeliveryDto {
  id: string;
  reminderId: string;
  title: string;
  description: string | null;
  occurrenceDate: string;
  firedAt: string;
  linkPath: string | null;
  linkLabel: string | null;
  linkAvailable: boolean;
}

const POLL_MS = 60_000;

/**
 * Campanita "lo que vence hoy" (FR-015). Descartar/posponer es individual por
 * usuario (FR-016/017/018). Refresca cada minuto y al abrir.
 */
export function DueTodayBell() {
  const [items, setItems] = useState<DeliveryDto[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ deliveries: DeliveryDto[] }>("/api/reminders/deliveries");
      setItems(res.deliveries);
    } catch {
      /* sin conexión: se reintenta en el próximo poll */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Recargar al abrir (datos frescos sin esperar al poll).
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Cerrar al click afuera.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const act = async (id: string, body: object) => {
    setItems((prev) => prev.filter((d) => d.id !== id)); // optimista
    try {
      await api(`/api/reminders/deliveries/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    } catch {
      void load(); // revertir si falló
    }
  };

  return (
    <div ref={ref} className="rem-bell">
      <button
        className="btn btn-ghost"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Recordatorios que vencen hoy${items.length ? ` (${items.length})` : ""}`}
        aria-expanded={open}
        style={{ position: "relative" }}
      >
        <Bell size={18} />
        {items.length > 0 && <span className="rem-bell-badge">{items.length}</span>}
      </button>

      {open && (
        <div className="rem-bell-pop" role="dialog" aria-label="Recordatorios que vencen hoy">
          <div className="rem-bell-title">Vence hoy</div>
          {items.length === 0 ? (
            <p className="rem-bell-empty">Nada pendiente por ahora.</p>
          ) : (
            items.map((d) => (
              <div key={d.id} className="rem-bell-item">
                <div className="rem-bell-item-title">{d.title}</div>
                {d.description && <div className="rem-bell-item-desc">{d.description}</div>}
                <div className="rem-bell-actions">
                  {d.linkPath ? (
                    <Link href={d.linkPath} className="btn btn-ghost" onClick={() => setOpen(false)}>
                      {d.linkLabel || "Abrir"}
                    </Link>
                  ) : d.linkAvailable === false && d.linkLabel !== null ? (
                    <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
                      recurso no disponible
                    </span>
                  ) : null}
                  <button className="btn btn-ghost" onClick={() => void act(d.id, { action: "SNOOZE", preset: "1h" })}>
                    <Clock size={12} /> 1h
                  </button>
                  <button className="btn btn-ghost" onClick={() => void act(d.id, { action: "SNOOZE", preset: "tomorrow" })}>
                    Mañana
                  </button>
                  <button className="btn btn-ghost" onClick={() => void act(d.id, { action: "DISMISS" })}>
                    <X size={12} /> Descartar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
