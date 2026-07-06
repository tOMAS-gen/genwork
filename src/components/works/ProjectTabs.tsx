"use client";

import type { ComponentType } from "react";

interface TabItem {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

export function ProjectTabs({
  items,
  activeKey,
  onChange,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="project-tabs" role="tablist">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === activeKey}
            className={item.key === activeKey ? "active" : ""}
            onClick={() => onChange(item.key)}
          >
            <Icon size={16} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
