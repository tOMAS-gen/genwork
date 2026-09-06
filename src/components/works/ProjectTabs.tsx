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
  panelId,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  panelId?: string;
}) {
  return (
    <div className="project-tabs" role="tablist" aria-label="Secciones del proyecto">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={panelId ? `${panelId}-tab-${item.key}` : undefined}
            aria-controls={panelId}
            aria-selected={item.key === activeKey}
            tabIndex={item.key === activeKey ? 0 : -1}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % items.length;
              else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = items.length - 1;
              else return;
              event.preventDefault();
              onChange(items[next].key);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus();
            }}
            className={item.key === activeKey ? "active" : ""}
            onClick={() => onChange(item.key)}
          >
            <Icon size={16} aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
