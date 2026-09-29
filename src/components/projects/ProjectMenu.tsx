"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@/components/ui/Menu";
import { Dialog } from "@/components/ui/Dialog";
import { RenameDialog } from "@/components/ui/RenameDialog";
import { Archive, ArchiveRestore, Folder, Pencil, Trash2 } from "@/components/ui/icons";
import { api } from "@/components/ui/useApi";
import { useToast } from "@/components/ui/Toast";

export function ProjectMenu({
  workId,
  workName,
  workStatus,
  canRename,
  onRenamed,
  onMoveToFolder,
}: {
  workId: string;
  workName: string;
  workStatus: "ACTIVE" | "ARCHIVED";
  canRename: boolean;
  onRenamed?: () => void;
  /** Feature 063: "Mover a carpeta…"; sin callback no se ofrece. */
  onMoveToFolder?: () => void;
}) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
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

  const moveItem = onMoveToFolder
    ? [{ label: "Mover a carpeta…", icon: <Folder size={16} />, onSelect: onMoveToFolder }]
    : [];

  // objetivos: "Guardar como plantilla" pasó al menú de cada objetivo (una
  // plantilla es UN objetivo); el proyecto entero ya no se guarda como plantilla.
  const items =
    workStatus === "ACTIVE"
      ? [
          ...(canRename
            ? [
                {
                  label: "Renombrar…",
                  icon: <Pencil size={16} />,
                  onSelect: () => setRenameDialogOpen(true),
                },
              ]
            : []),
          ...moveItem,
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
          ...(canRename
            ? [
                {
                  label: "Renombrar…",
                  icon: <Pencil size={16} />,
                  onSelect: () => setRenameDialogOpen(true),
                },
              ]
            : []),
          ...moveItem,
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

      <RenameDialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        title="Renombrar proyecto"
        label="proyecto"
        initialName={workName}
        onSave={async (name) => {
          await api(`/api/works/${workId}`, {
            method: "PATCH",
            body: JSON.stringify({ name }),
          });
          if (onRenamed) {
            onRenamed();
          } else {
            router.refresh();
          }
        }}
      />
    </>
  );
}
