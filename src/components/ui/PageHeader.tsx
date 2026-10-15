import type { ReactNode } from "react";
import { PageHeader as GenPageHeader } from "@gen/ui";
import {
  AtSign,
  Bell,
  FileText,
  Folder,
  Layers,
  LayoutDashboard,
  Settings,
  Sun,
  Users,
} from "@/components/ui/icons";

const PAGE_ICONS = {
  projects: Folder,
  sectors: Layers,
  groups: Users,
  notes: FileText,
  references: AtSign,
  myDay: Sun,
  reminders: Bell,
  settings: Settings,
  board: LayoutDashboard,
};

/** PageHeader de @gen/ui con los íconos de sección de genwork por nombre. */
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
  return <GenPageHeader title={title} description={description} icon={icon ? PAGE_ICONS[icon] : undefined} actions={actions} />;
}
