import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { ProjectCard, type DashboardWork } from "@/components/dashboard/ProjectCard";
import { StatsBar } from "@/components/dashboard/StatsBar";

// T42 (spec 066): card de proyecto y franja de KPI como la app Android.
const work: DashboardWork = {
  id: "w1",
  name: "Cartelería del local",
  description: null,
  groupId: "g",
  groupName: "QA",
  group: { id: "g", name: "QA" },
  createdById: "u",
  createdAt: "2026-10-01T00:00:00.000Z",
  dueDate: "2026-10-29T00:00:00.000Z",
  sectorIds: [],
  isFavorite: false,
  taskCounts: { done: 1, total: 3 },
  labels: [],
  stage: null,
};

describe("ProjectCard", () => {
  afterEach(() => vi.useRealTimers());

  it("el nombre como título, plazo corto y «1/3 · 33%» en una fila", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T12:00:00"));
    const html = renderToString(
      <ProjectCard project={work} archived={false} onToggleFavorite={() => {}} onArchiveToggle={() => {}} />,
    );
    expect(html).toContain('class="pc-name"');
    expect(html).not.toContain("CARTELERÍA DEL LOCAL");
    expect(html).toContain("due-warning");
    expect(html).toContain(">1 día</span>");
    expect(html).toMatch(/1<!-- -->\/<!-- -->3<!-- --> · <!-- -->33<!-- -->%/);
    expect(html).not.toContain("1/3 tareas");
  });
});

describe("StatsBar", () => {
  it("una franja con las cifras y sin porcentaje", () => {
    const html = renderToString(<StatsBar projects={[work]} />);
    expect(html).toContain('class="stats-strip"');
    expect(html).not.toContain("%");
    expect(html.match(/stats-strip-item/g)).toHaveLength(4);
  });
});
