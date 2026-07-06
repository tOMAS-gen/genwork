"use client";

import { useRef } from "react";
import { Calendar } from "@/components/ui/icons";

function formatDisplay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function DatePicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    inputRef.current?.showPicker?.();
    inputRef.current?.focus();
  };

  return (
    <span className={`date-picker-trigger ${className ?? ""}`}>
      <button type="button" className="date-picker-btn" onClick={openPicker}>
        <Calendar size={14} />
        <span>{value ? formatDisplay(value) : "Sin fecha"}</span>
      </button>
      {value && (
        <button
          type="button"
          className="date-picker-clear"
          aria-label="Quitar fecha"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
          }}
        >
          ×
        </button>
      )}
      <input
        ref={inputRef}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="date-picker-input"
      />
    </span>
  );
}
