"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import { ProjectFolderSelect } from "@/components/projects/ProjectFolderSelect";
import { OBJECTIVE_DESCRIPTION_MAX, OBJECTIVE_TITLE_MAX } from "@/lib/domain/objectives/validation";

interface Group {
  id: string;
  name: string;
}

/**
 * Diálogo de creación de proyecto (FR-102): ámbito + nombre + descripción.
 *
 * objetivos: dos variantes más.
 * - `template` ("Nuevo proyecto desde plantilla"): el proyecto nace con esa
 *   plantilla insertada como objetivo; el título del objetivo se puede editar.
 * - `isTemplate` ("Nueva plantilla de objetivo"): una plantilla ES un
 *   objetivo, así que los campos se rotulan como tal.
 */
export function CreateProjectDialog({
  open,
  onClose,
  onCreated,
  template,
  isTemplate,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Plantilla elegida en "Desde plantilla" (se manda como `cloneFromId`). */
  template?: { id: string; name: string } | null;
  /** T004: si viene del filtro "Plantillas", crea el proyecto marcado como plantilla. */
  isTemplate?: boolean;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [scope, setScope] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objectiveTitle, setObjectiveTitle] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (open) void api<Group[]>("/api/groups").then(setGroups).catch(() => {});
  }, [open]);

  // Título del objetivo precargado con el nombre de la plantilla elegida.
  useEffect(() => {
    if (open) setObjectiveTitle(template?.name.slice(0, OBJECTIVE_TITLE_MAX) ?? "");
  }, [open, template]);

  const reset = () => {
    setName("");
    setDescription("");
    setObjectiveTitle("");
    setScope("");
    setFolderId(null);
    setError("");
  };

  const create = async () => {
    if (!name.trim()) {
      setError(isTemplate ? "Poné un título al objetivo" : "Poné un nombre al proyecto");
      return;
    }
    const trimmedObjective = objectiveTitle.trim();
    try {
      const work = await api<{ id: string }>("/api/works", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          groupId: scope || null,
          ...(template ? { cloneFromId: template.id } : {}),
          // Sin cambios (o vacío) → el backend usa el nombre de la plantilla.
          ...(template && trimmedObjective && trimmedObjective !== template.name
            ? { objectiveTitle: trimmedObjective }
            : {}),
          ...(isTemplate ? { isTemplate: true } : { projectFolderId: folderId }),
        }),
      });
      reset();
      onCreated();
      onClose();
      router.push(`/works/${work.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={
        isTemplate
          ? "Nueva plantilla de objetivo"
          : template
            ? "Nuevo proyecto desde plantilla"
            : "Nuevo proyecto"
      }
    >
      <div className="dialog-field">
        <label htmlFor="np-scope">Ámbito</label>
        <select
          id="np-scope"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            // Las carpetas son por ámbito: al cambiarlo, la elegida deja de valer.
            setFolderId(null);
          }}
        >
          <option value="">Para mí (personal)</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Grupo {g.name}
            </option>
          ))}
        </select>
      </div>
      {!isTemplate && open && (
        <div className="dialog-field">
          <label htmlFor="np-folder">Carpeta (opcional)</label>
          <ProjectFolderSelect
            id="np-folder"
            groupId={scope || null}
            value={folderId}
            onChange={(f) => setFolderId(f?.id ?? null)}
          />
        </div>
      )}
      <div className="dialog-field">
        <label htmlFor="np-name">{isTemplate ? "Título del objetivo" : "Nombre"}</label>
        <input
          id="np-name"
          autoFocus
          value={name}
          maxLength={OBJECTIVE_TITLE_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder={isTemplate ? "Ej.: Instalación eléctrica" : "Ej.: Tina – Remodelación de paneles"}
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
      </div>
      <div className="dialog-field">
        <label htmlFor="np-desc">{isTemplate ? "Descripción" : "Descripción (opcional)"}</label>
        <input
          id="np-desc"
          value={description}
          maxLength={OBJECTIVE_DESCRIPTION_MAX}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isTemplate ? "Opcional: se copia al objetivo al insertarla" : "Una línea que resuma el proyecto"}
        />
      </div>
      {isTemplate && (
        <p className="muted" style={{ margin: 0 }}>
          Una plantilla es un objetivo reutilizable: sus tareas pendientes se copian cada vez que la
          insertás en un proyecto.
        </p>
      )}
      {template && (
        <>
          <div className="dialog-field">
            <label htmlFor="np-objective">Título del objetivo</label>
            <input
              id="np-objective"
              value={objectiveTitle}
              maxLength={OBJECTIVE_TITLE_MAX}
              onChange={(e) => setObjectiveTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void create()}
            />
          </div>
          <p className="muted" style={{ margin: 0 }}>
            El proyecto nace con el objetivo «{objectiveTitle.trim() || template.name}» y las tareas
            pendientes de la plantilla (con sus subtareas).
          </p>
        </>
      )}
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      <div className="dialog-actions">
        <button
          className="btn"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={() => void create()}>
          {isTemplate ? "Crear plantilla" : "Crear proyecto"}
        </button>
      </div>
    </Dialog>
  );
}
