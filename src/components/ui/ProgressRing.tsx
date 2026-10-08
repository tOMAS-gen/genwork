import type { ReactNode } from "react";

/**
 * Círculo de progreso que se va completando, con el porcentaje (o `children`)
 * en el centro. `children={null}` deja el círculo solo, sin texto.
 */
export function ProgressRing({
  percent,
  size = 36,
  stroke = 3,
  tone = "accent",
  label,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  tone?: "accent" | "ok" | "danger";
  /** Texto accesible; por defecto "N%". */
  label?: string;
  children?: ReactNode;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <span
      className={`progress-ring progress-ring-${tone}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label ?? `${value}%`}
    >
      <svg className="progress-ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="progress-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      {children !== null && (
        <span className="progress-ring-center">{children === undefined ? `${value}%` : children}</span>
      )}
    </span>
  );
}
