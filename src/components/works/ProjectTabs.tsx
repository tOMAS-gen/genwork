"use client";

import type { ComponentType } from "react";
import { Tabs } from "@gen/ui";

interface TabItem {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

/** Pestañas del detalle de proyecto: `Tabs` de @gen/ui (flechas, Home, End). */
export function ProjectTabs({
  items,
  activeKey,
  onChange,
  panelId,
  ariaLabel = "Secciones del proyecto",
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  panelId?: string;
  ariaLabel?: string;
}) {
  return <Tabs items={items} activeKey={activeKey} onChange={onChange} panelId={panelId} ariaLabel={ariaLabel} />;
}
