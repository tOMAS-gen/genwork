"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (value: boolean) => void;
} | null;

let root: Root | null = null;
let setState: ((s: ConfirmState) => void) | null = null;
let pending: ConfirmState = null;

function ensureHost() {
  if (root) return;
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(<ConfirmHost />);
}

export function showConfirm(
  message: string,
  opts?: { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean },
): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  ensureHost();
  return new Promise<boolean>((resolve) => {
    const next: ConfirmState = {
      title: opts?.title ?? "Confirmar",
      message,
      confirmLabel: opts?.confirmLabel ?? "Aceptar",
      cancelLabel: opts?.cancelLabel ?? "Cancelar",
      danger: opts?.danger ?? false,
      resolve,
    };
    if (setState) {
      flushSync(() => setState!(next));
    } else {
      pending = next;
    }
  });
}

function ConfirmHost() {
  const [state, setLocal] = useState<ConfirmState>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setState = setLocal;
    if (pending) {
      setLocal(pending);
      pending = null;
    }
    return () => { setState = null; };
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (state && !el.open) {
      el.showModal();
      confirmBtnRef.current?.focus();
    }
    if (!state && el.open) el.close();
  }, [state]);

  const close = (value: boolean) => {
    state?.resolve(value);
    setLocal(null);
  };

  if (!state) return null;

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      onClose={() => close(false)}
      onCancel={() => close(false)}
      onClick={(e) => { if (e.target === dialogRef.current) close(false); }}
    >
      <div className="dialog-body">
        <h2 className="dialog-title">{state.title}</h2>
        <p style={{ margin: 0, whiteSpace: "pre-line" }}>{state.message}</p>
        <div className="dialog-actions">
          <button className="btn" onClick={() => close(false)}>
            {state.cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            className={`btn ${state.danger ? "btn-danger" : "btn-primary"}`}
            onClick={() => close(true)}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
