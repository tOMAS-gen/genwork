"use client";

import { useFormStatus } from "react-dom";

/** Deshabilita el botón mientras el Server Action está en curso (evita doble submit). */
export function SubmitButton({
  className,
  style,
  pendingLabel,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} style={style} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}
