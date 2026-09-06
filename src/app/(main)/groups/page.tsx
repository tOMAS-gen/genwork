"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Plus, Users } from "@/components/ui/icons";
import { GroupCard, type GroupCardData } from "@/components/groups/GroupCard";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { usePageTitle } from "@/lib/usePageTitle";

export default function GroupsPage() {
  usePageTitle("Grupos");
  const [groups, setGroups] = useState<GroupCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    setLoading(true);
    void api<GroupCardData[]>("/api/groups")
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <PageHeader title="Grupos" description="Equipos, miembros y proyectos compartidos." icon="groups" actions={
        <button
          className="btn btn-primary"
          onClick={() => setDialogOpen(true)}
          title="Crear un grupo"
          aria-label="Crear un grupo"
          style={{ padding: "8px 12px" }}
        >
          <Plus size={20} />
        </button>
      } />

      <CreateGroupDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />

      {loading ? (
        <div className="sector-grid">
          <Skeleton variant="card" height="72px" />
          <Skeleton variant="card" height="72px" />
          <Skeleton variant="card" height="72px" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin grupos todavía"
          description="Lo que crees fuera de un grupo es personal: solo lo ves vos. Creá un grupo para compartir proyectos con tu equipo."
          action={{ label: "Nuevo grupo", onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <div className="sector-grid">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
