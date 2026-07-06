"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { TemplateSelector } from "@/components/works/TemplateSelector";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { ProjectCard, type DashboardWork } from "@/components/dashboard/ProjectCard";
import { ProjectListRow } from "@/components/dashboard/ProjectListRow";
import { FilterBar, type DashboardFilters } from "@/components/dashboard/FilterBar";
import { getProjectStatus } from "@/lib/domain/works/dashboardUtils";
import { Plus, FolderOpen, BookTemplate } from "@/components/ui/icons";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Menu } from "@/components/ui/Menu";

type ViewMode = "grid" | "list";
type SortBy = "recent" | "name" | "progress";

const PAGE_SIZE = 12;

interface SectorOption {
  id: string;
  name: string;
}

/** Aplica en AND los filtros del dashboard sobre la lista de proyectos. */
function filterProjects(
  works: DashboardWork[],
  filters: DashboardFilters,
  queryFilter: { kind: "mine" | "favorites" | "templates" | null; userId: string | null },
): DashboardWork[] {
  const text = filters.text.trim().toLowerCase();

  return works.filter((work) => {
    if (text) {
      const haystack = `${work.name} ${work.description ?? ""}`.toLowerCase();
      if (!haystack.includes(text)) return false;
    }

    if (filters.sectorId && !work.sectorIds.includes(filters.sectorId)) {
      return false;
    }

    if (filters.labelValueId && !work.labels.some((l) => l.valueId === filters.labelValueId)) {
      return false;
    }

    if (filters.status) {
      const status = getProjectStatus(work.taskCounts.done, work.taskCounts.total);
      if (status !== filters.status) return false;
    }

    if (queryFilter.kind === "mine" && work.createdById !== queryFilter.userId) {
      return false;
    }

    if (queryFilter.kind === "favorites" && !work.isFavorite) {
      return false;
    }

    return true;
  });
}

/** Ordena proyectos del dashboard según el criterio elegido (FR-T018). */
function sortProjects(projects: DashboardWork[], sortBy: SortBy): DashboardWork[] {
  const sorted = [...projects];

  if (sortBy === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "progress") {
    sorted.sort((a, b) => {
      const pa = a.taskCounts.total > 0 ? a.taskCounts.done / a.taskCounts.total : 0;
      const pb = b.taskCounts.total > 0 ? b.taskCounts.done / b.taskCounts.total : 0;
      return pb - pa;
    });
  } else {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return sorted;
}

/** Home: dashboard de proyectos (FR-7xx) con stats, grilla de cards y "Mis referencias" (@usuario). */
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const queryFilterKind = searchParams.get("filter") === "mine"
    ? "mine"
    : searchParams.get("filter") === "favorites"
      ? "favorites"
      : searchParams.get("filter") === "templates"
        ? "templates"
        : null;
  const queryStatus = searchParams.get("status") === "ARCHIVED" ? "ARCHIVED" : null;

  const [works, setWorks] = useState<DashboardWork[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newIsTemplate, setNewIsTemplate] = useState(false);
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    text: "",
    sectorId: "",
    labelValueId: "",
    status: "",
  });
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const worksUrl = queryStatus
      ? `/api/works?status=${queryStatus}`
      : queryFilterKind === "templates"
        ? "/api/works?filter=templates"
        : "/api/works";
    setLoading(true);
    void api<DashboardWork[]>(worksUrl)
      .then(setWorks)
      .catch(() => {})
      .finally(() => setLoading(false));
    void api<SectorOption[]>("/api/sectors").then(setSectors).catch(() => {});
    void api<{ id: string }>("/api/me").then((me) => setCurrentUserId(me.id)).catch(() => {});
  }, [queryStatus, queryFilterKind]);

  useEffect(load, [load]);
  useLiveRefresh(load);

  const handleToggleFavorite = useCallback(async (workId: string) => {
    setWorks((prev) =>
      prev.map((work) => (work.id === workId ? { ...work, isFavorite: !work.isFavorite } : work))
    );

    const target = works.find((work) => work.id === workId);
    const wasFavorite = target?.isFavorite ?? false;

    try {
      if (wasFavorite) {
        await api(`/api/favorites/${workId}`, { method: "DELETE" });
        toast("Quitado de favoritos", "success");
      } else {
        await api("/api/favorites", {
          method: "POST",
          body: JSON.stringify({ workId }),
        });
        toast("Agregado a favoritos", "success");
      }
    } catch {
      setWorks((prev) =>
        prev.map((work) => (work.id === workId ? { ...work, isFavorite: wasFavorite } : work))
      );
      toast("No se pudo actualizar el favorito", "error");
    }
  }, [works, toast]);

  const labelKeys = useMemo(() => {
    const seen = new Map<string, DashboardWork["labels"][number]>();
    for (const work of works) {
      for (const label of work.labels) {
        if (!seen.has(label.valueId)) seen.set(label.valueId, label);
      }
    }
    return Array.from(seen.values());
  }, [works]);

  const filteredWorks = useMemo(
    () => filterProjects(works, filters, { kind: queryFilterKind, userId: currentUserId }),
    [works, filters, queryFilterKind, currentUserId]
  );
  const sortedWorks = useMemo(() => sortProjects(filteredWorks, sortBy), [filteredWorks, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedWorks.length / PAGE_SIZE));
  const pagedWorks = useMemo(
    () => sortedWorks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedWorks, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>
          {queryFilterKind === "mine" ? "Mis Proyectos"
            : queryFilterKind === "favorites" ? "Proyectos Favoritos"
            : queryFilterKind === "templates" ? "Proyectos Plantilla"
            : queryStatus === "ARCHIVED" ? "Archivados"
            : "Todos los Proyectos"}
        </h1>
        {queryFilterKind === "templates" ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSelectedTemplateId(null);
              setNewIsTemplate(true);
              setDialogOpen(true);
            }}
          >
            Nueva plantilla
          </button>
        ) : queryStatus === "ARCHIVED" || queryFilterKind === "favorites" ? null : (
          <Menu
            label="Crear un proyecto"
            trigger={<Plus size={20} />}
            className="btn btn-primary"
            items={[
              {
                label: "Nuevo proyecto",
                icon: <Plus size={16} />,
                onSelect: () => {
                  setSelectedTemplateId(null);
                  setNewIsTemplate(false);
                  setDialogOpen(true);
                },
              },
              {
                label: "Desde plantilla",
                icon: <BookTemplate size={16} />,
                onSelect: () => setTemplateSelectorOpen(true),
              },
            ]}
          />
        )}
      </div>

      <TemplateSelector
        open={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelect={(templateId) => {
          setSelectedTemplateId(templateId);
          setDialogOpen(true);
        }}
      />

      <CreateProjectDialog
        open={dialogOpen}
        cloneFromId={selectedTemplateId}
        isTemplate={newIsTemplate}
        onClose={() => {
          setDialogOpen(false);
          setSelectedTemplateId(null);
          setNewIsTemplate(false);
        }}
        onCreated={() => {
          load();
          setSelectedTemplateId(null);
          setNewIsTemplate(false);
          toast(newIsTemplate ? "Plantilla creada" : "Proyecto creado", "success");
        }}
      />

      <StatsBar projects={filteredWorks} />

      <FilterBar
        sectors={sectors}
        labelKeys={labelKeys}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {loading ? (
        <div className="project-grid">
          <Skeleton variant="card" height="200px" />
          <Skeleton variant="card" height="200px" />
          <Skeleton variant="card" height="200px" />
        </div>
      ) : works.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={queryFilterKind === "templates" ? "Sin plantillas todavía"
            : queryFilterKind === "favorites" ? "Sin favoritos"
            : queryFilterKind === "mine" ? "Sin proyectos propios"
            : queryStatus === "ARCHIVED" ? "Sin proyectos archivados"
            : "Todavía no tenés proyectos"}
          description={queryFilterKind === "templates"
            ? "Creá una plantilla para reutilizar estructuras de proyecto."
            : queryFilterKind === "favorites"
              ? "Marcá proyectos como favoritos para verlos acá."
              : queryFilterKind === "mine"
                ? "Los proyectos que vos creaste aparecen acá."
                : queryStatus === "ARCHIVED"
                  ? "Los proyectos archivados aparecen acá."
                  : "Creá tu primer proyecto para empezar a organizar tareas y sectores."}
          action={queryStatus === "ARCHIVED" || queryFilterKind === "favorites" || queryFilterKind === "mine" ? undefined : {
            label: queryFilterKind === "templates" ? "Nueva plantilla" : "Nuevo proyecto",
            onClick: () => {
              if (queryFilterKind === "templates") setNewIsTemplate(true);
              setDialogOpen(true);
            },
          }}
        />
      ) : viewMode === "grid" ? (
        <div className="project-grid">
          {pagedWorks.map((project) => (
            <ProjectCard key={project.id} project={project} onToggleFavorite={handleToggleFavorite} />
          ))}
          {sortedWorks.length === 0 && (
            <p className="muted">Sin proyectos que coincidan con el filtro.</p>
          )}
        </div>
      ) : (
        <div className="table-scroll-wrapper">
          <table className="project-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Grupo</th>
                <th>Etiquetas</th>
                <th>Progreso</th>
                <th>Entrega</th>
                <th>Días restantes</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagedWorks.map((project) => (
                <ProjectListRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
          {sortedWorks.length === 0 && (
            <p className="muted">Sin proyectos que coincidan con el filtro.</p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            {"< Anterior"}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              className={page === currentPage ? "active" : ""}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            {"Siguiente >"}
          </button>
        </div>
      )}

    </div>
  );
}
