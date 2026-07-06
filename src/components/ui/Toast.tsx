"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { AlertCircle, CheckCircle, Info, X } from "@/components/ui/icons";

/**
 * Toast mínimo, sin provider (research R3 / contracts/delta.md).
 * API imperativa: `showToast({ message, href?, linkLabel? })`.
 * Monta un contenedor singleton en document.body la primera vez que se usa.
 * Un toast nuevo REEMPLAZA al anterior (sin apilar). No roba foco
 * (role="status" + aria-live="polite", sin llamadas a .focus()).
 */

const AUTO_DISMISS_MS = 5000;
const EXIT_ANIM_MS = 180; // debe coincidir con la duración de .toast-closing en globals.css

export type ShowToastOptions = {
  message: string;
  href?: string;
  linkLabel?: string;
};

type ToastData = ShowToastOptions & { id: number };

let root: Root | null = null;
let setToastData: ((toast: ToastData | null) => void) | null = null;

/** Crea (una sola vez) el contenedor + root de React donde vive el toast. */
function ensureHost(): void {
  if (root) return;
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(<ToastHost />);
}

/** Muestra un toast. Reemplaza cualquier toast visible en ese momento. */
export function showToast(options: ShowToastOptions): void {
  if (typeof document === "undefined") return; // guard SSR, por las dudas
  ensureHost();
  setToastData?.({ ...options, id: Date.now() });
}

function ToastHost() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [closing, setClosing] = useState(false);

  // Registra el setter para que `showToast` pueda actualizar este componente.
  useEffect(() => {
    setToastData = (next) => {
      setClosing(false);
      setToast(next);
    };
    return () => {
      setToastData = null;
    };
  }, []);

  // Auto-dismiss a los 5 s.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setClosing(true), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Tras iniciar el cierre, espera la animación de salida y desmonta.
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setToast(null), EXIT_ANIM_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  if (!toast) return null;

  return (
    <div
      className={`toast ${closing ? "toast-closing" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-message">{toast.message}</span>
      {toast.href && (
        <a className="toast-link" href={toast.href}>
          {toast.linkLabel ?? "Ver"}
        </a>
      )}
      <button
        type="button"
        className="toast-close"
        onClick={() => setClosing(true)}
        aria-label="Cerrar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ============ ToastProvider / useToast (feature 008, T005) ============ */
/**
 * Provider con stack de hasta 3 toasts, apilados verticalmente abajo-derecha.
 * Auto-dismiss a los 3s para success/info; error queda persistente hasta
 * que el usuario lo cierre con el botón X. Independiente del `showToast`
 * imperativo de arriba (que sigue existiendo para el flujo legacy).
 */

export type ToastType = "success" | "error" | "info";

const STACK_AUTO_DISMISS_MS = 3000;
const STACK_EXIT_ANIM_MS = 180; // debe coincidir con .toast-item-closing en globals.css
const MAX_VISIBLE_TOASTS = 3;

type StackToastData = {
  id: number;
  message: string;
  type: ToastType;
  closing: boolean;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let stackToastIdSeq = 0;

const TOAST_TYPE_ICON: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<StackToastData[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const startClosing = useCallback(
    (id: number) => {
      const timer = timers.current.get(id);
      if (timer) {
        clearTimeout(timer);
      }
      setToasts((current) => current.map((t) => (t.id === id ? { ...t, closing: true } : t)));
      timers.current.set(
        id,
        setTimeout(() => removeToast(id), STACK_EXIT_ANIM_MS),
      );
    },
    [removeToast],
  );

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++stackToastIdSeq;
      setToasts((current) => {
        const next = [...current, { id, message, type, closing: false }];
        // Mantiene como máximo 3 visibles: descarta los más viejos.
        return next.length > MAX_VISIBLE_TOASTS ? next.slice(next.length - MAX_VISIBLE_TOASTS) : next;
      });

      if (type !== "error") {
        timers.current.set(
          id,
          setTimeout(() => startClosing(id), STACK_AUTO_DISMISS_MS),
        );
      }
    },
    [startClosing],
  );

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => {
          const Icon = TOAST_TYPE_ICON[t.type];
          return (
            <div
              key={t.id}
              className={`toast-item toast-item-${t.type} ${t.closing ? "toast-item-closing" : ""}`}
              role="status"
              aria-live="polite"
            >
              <Icon size={16} className="toast-item-icon" />
              <span className="toast-item-message">{t.message}</span>
              {t.type === "error" && (
                <button
                  type="button"
                  className="toast-item-close"
                  onClick={() => startClosing(t.id)}
                  aria-label="Cerrar aviso"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
