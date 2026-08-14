"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { useLiveRefresh } from "@/components/live/useLiveRefresh";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FolderOpen } from "@/components/ui/icons";
import { PortalProjectCard } from "@/components/portal/PortalProjectCard";
import type { PortalWorkSummary } from "@/components/portal/types";
import { usePageTitle } from "@/lib/usePageTitle";

/** Listado de proyectos otorgados al cliente (feature 059, US2). */
export default function PortalHomePage() {
  usePageTitle("Mis proyectos");
  const [works, setWorks] = useState<PortalWorkSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<PortalWorkSummary[]>("/api/portal/works")
      .then((data) => {
        setWorks(data);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);
  useLiveRefresh(load, undefined, { url: "/api/portal/stream" });

  return (
    <>
      <h1 className="page-title">Mis proyectos</h1>

      {error && <p className="form-error">{error}</p>}

      {works === null && !error && (
        <div className="project-grid">
          <Skeleton height="160px" variant="card" />
          <Skeleton height="160px" variant="card" />
          <Skeleton height="160px" variant="card" />
        </div>
      )}

      {works !== null && works.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title="Todavía no hay proyectos para ver"
          description="Cuando te den acceso a un proyecto, va a aparecer acá con su avance."
        />
      )}

      {works !== null && works.length > 0 && (
        <div className="project-grid">
          {works.map((work) => (
            <PortalProjectCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </>
  );
}
