import type { ReactNode } from "react";
import {
  AtSign,
  Bell,
  FileText,
  Folder,
  Layers,
  LayoutDashboard,
  Settings,
  Users,
} from "@/components/ui/icons";

const PAGE_ICONS = {
  projects: Folder,
  sectors: Layers,
  groups: Users,
  notes: FileText,
  references: AtSign,
  reminders: Bell,
  settings: Settings,
  board: LayoutDashboard,
};

/** Shared page heading: GenStock's compact icon, title and action alignment. */
export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: keyof typeof PAGE_ICONS;
  actions?: ReactNode;
}) {
  const Icon = icon ? PAGE_ICONS[icon] : undefined;
  return (
    <header className="page-header">
      <div className="page-header-heading">
        {Icon && (
          <span className="page-header-icon">
            <Icon size={22} aria-hidden="true" />
          </span>
        )}
        <div className="page-header-copy">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
