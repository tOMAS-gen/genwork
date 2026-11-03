import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";

type Icon = ComponentType<{ size?: number | string; "aria-hidden"?: boolean | "true" }>;

/**
 * Grupo de filas de ajuste, como `SettingsGroup` de la app (spec 066, T41):
 * rótulo opcional en 11/700 mayúsculas y una card con las filas separadas por
 * una línea fina.
 */
export function SettingsGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="settings-group">
      {label && <h2 className="settings-group-label">{label}</h2>}
      <div className="settings-group-card">{children}</div>
    </section>
  );
}

/**
 * Fila de ajuste de 56 px: ícono de 20 en gris, título 15/600, una línea de
 * descripción en 12 gris y el chevron si navega.
 */
export function SettingsRow({
  href,
  icon: RowIcon,
  title,
  subtitle,
  trailing,
}: {
  href?: string;
  icon?: Icon;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      {RowIcon && (
        <span className="settings-row-icon">
          <RowIcon size={20} aria-hidden="true" />
        </span>
      )}
      <span className="settings-row-copy">
        <span className="settings-row-title">{title}</span>
        {subtitle && <span className="settings-row-subtitle">{subtitle}</span>}
      </span>
      {trailing}
      {href && !trailing && (
        <span className="settings-row-chevron">
          <ChevronRight size={20} aria-hidden="true" />
        </span>
      )}
    </>
  );
  return href ? (
    <Link className="settings-row" href={href}>
      {content}
    </Link>
  ) : (
    <div className="settings-row">{content}</div>
  );
}
