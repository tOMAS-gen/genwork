"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@/components/ui/Menu";
import { Dialog } from "@/components/ui/Dialog";
import { Archive, ArchiveRestore, BookTemplate, Trash2 } from "@/components/ui/icons";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";

export function ProjectMenu({
  workId,
  workName,
  workStatus,
}: {
  workId: string;
  workName: string;
  workStatus: "ACTIVE" | "ARCHIVED";
}) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const archive = async () => {
    try {
      await api(`/api/works/${workId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      toast("Proyecto archivado", "success");
      router.push("/");
    } catch {
      toast("Error al archivar", "error");
    }
  };

  const unarchive = async () => {
    try {
      await api(`/api/works/${workId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      toast("Proyecto desarchivado", "success");
      router.refresh();
    } catch {
      toast("Error al desarchivar", "error");
    }
  };

  const deleteProject = async () => {
    try {
      await api(`/api/works/${workId}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmName: deleteConfirmName }),
      });
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const items =
    workStatus === "ACTIVE"
      ? [
          {
            label: "Guardar como plantilla",
            icon: <BookTemplate size={16} />,
            onSelect: async () => {
              try {
                const result = await api<{ id: string; name: string }>(`/api/works/${workId}/clone`, { method: "POST" });
                toast(`Plantilla "${result.name}" creada`, "success");
              } catch {
                toast("Error al crear plantilla", "error");
              }
            },
          },
          {
            label: "Archivar",
            icon: <Archive size={16} />,
            onSelect: () => setArchiveDialogOpen(true),
          },
          {
            label: "Eliminar proyecto…",
            icon: <Trash2 size={16} />,
            danger: true,
            onSelect: () => {
              setError("");
              setDeleteConfirmName("");
              setDeleteDialogOpen(true);
            },
          },
        ]
      : [
          {
            label: "Desarchivar",
            icon: <ArchiveRestore size={16} />,
            onSelect: () => void unarchive(),
          },
          {
            label: "Eliminar definitivamente…",
            icon: <Trash2 size={16} />,
            danger: true,
            onSelect: () => {
              setError("");
              setDeleteConfirmName("");
              setDeleteDialogOpen(true);
            },
          },
        ];

  return (
    <>
      <Menu items={items} label="Acciones del proyecto" />

      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        title="Archivar proyecto"
      >
        <p className="muted" style={{ margin: 0 }}>
          <strong>{workName}</strong> pasará a la sección de archivados y dejará de verse en las vistas activas.
        </p>
        <div className="dialog-actions">
          <button className="btn" onClick={() => setArchiveDialogOpen(false)}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setArchiveDialogOpen(false);
              void archive();
            }}
          >
            Archivar
          </button>
        </div>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title={workStatus === "ARCHIVED" ? "Eliminar definitivamente" : "Eliminar proyecto"}
      >
        <p className="muted" style={{ margin: 0 }}>
          Se eliminará <strong>{workName}</strong> con todas sus tareas, documentos y archivos.
          No se puede deshacer. Escribí el nombre exacto para confirmar:
        </p>
        <input
          placeholder={workName}
          value={deleteConfirmName}
          onChange={(e) => setDeleteConfirmName(e.target.value)}
        />
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
        <div className="dialog-actions">
          <button className="btn" onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            disabled={deleteConfirmName.trim() !== workName}
            onClick={() => void deleteProject()}
          >
            {workStatus === "ARCHIVED" ? "Eliminar definitivamente" : "Eliminar proyecto"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
