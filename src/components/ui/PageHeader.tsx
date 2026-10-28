import type { ReactNode } from "react";
import { PageHeader as GenPageHeader } from "@gen/ui";

/** Secciones que antes llevaban ícono en la cabecera. */
type PageIcon =
  | "projects"
  | "sectors"
  | "groups"
  | "notes"
  | "references"
  | "myDay"
  | "reminders"
  | "settings"
  | "board";

/**
 * PageHeader de @gen/ui con la cabecera de raíz de la app Android (spec 066,
 * T40): título 20/700, subtítulo de una línea y las acciones a la derecha,
 * sin el ícono de sección. `icon` se acepta por compatibilidad y no se dibuja.
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: PageIcon;
  actions?: ReactNode;
}) {
  void icon;
  return <GenPageHeader title={title} description={description} actions={actions} />;
}
