"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/components/ui/useApi";
import { Tag, X, Plus, Check, Pencil } from "@/components/ui/icons";

interface LabelValueDto {
  id: string;
  name: string;
  color: string;
}

interface LabelKeyDto {
  id: string;
  name: string;
  scope?: "global" | "group" | "personal";
  values: LabelValueDto[];
}

export interface WorkLabelDto {
  keyId: string;
  keyName: string;
  /** Si esta asignación es LA etiqueta principal del proyecto (da el color de la tarjeta). */
  isPrimary?: boolean;
  valueId: string;
  valueName: string;
  color: string;
}

const scopeLabel: Record<"global" | "group" | "personal", string> = {
  global: "Globales",
  group: "Del grupo",
  personal: "Personales",
};

/**
 * Chips de etiquetas del proyecto + picker con dos secciones de mismo patrón visual
 * (título + botón "Agregar etiqueta" que despliega un buscador):
 * - Principal: a lo sumo una clave-valor (cualquiera), da el color de la tarjeta. Con
 *   una ya asignada, el botón de agregar se oculta — solo queda el chip con su "quitar".
 * - Secundarias: cualquier cantidad de valores, sin restricción de una por clave (ej.
 *   varios valores de "Redes sociales" a la vez, más otras claves distintas).
 * Sin gate de permisos duplicado en el cliente: si el usuario no administra el ámbito, las
 * acciones de creación/edición de claves/valores devuelven 403 y se muestra el error.
 */
export function LabelPicker({
  workId,
  workGroupId,
  labels,
  onChanged,
}: {
  workId: string;
  workGroupId: string | null;
  labels: WorkLabelDto[];
  /** Reservado para futuros gates de UI; la gestión decide permisos vía 403 del servidor. */
  canManageAmbito?: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<LabelKeyDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addingSection, setAddingSection] = useState<"primary" | "secondary" | null>(null);
  // Espejo síncrono de `addingSection`, leído desde el listener de "cancel" de más abajo: ese
  // listener se registra una sola vez al montar (ver por qué en el comentario del efecto), así
  // que no puede depender del closure de un efecto que recién se monta cuando se abre el popover.
  const addingSectionRef = useRef<"primary" | "secondary" | null>(null);
  addingSectionRef.current = addingSection;
  const popoverRef = useRef<HTMLDivElement>(null);
  // Botón "Agregar etiqueta" que abrió el popover: para devolverle el foco al cerrar con Escape.
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);

  // El popover flotante se cierra al clickear afuera de su propio contenido.
  // El botón "Agregar etiqueta" (addTriggerRef) queda excluido a propósito: es
  // un toggle (ver toggleAdd) y vive fuera del popover (es su hermano en el
  // DOM, no su descendiente) — sin esta exclusión, el mousedown sobre el
  // propio botón para volver a abrirlo ya cuenta como "click afuera" y lo
  // cierra antes de que el click subsiguiente del mismo botón lo reabra,
  // dando la sensación de que nunca se puede cerrar con un segundo click.
  useEffect(() => {
    if (!addingSection) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (addTriggerRef.current?.contains(target)) return;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setAddingSection(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [addingSection]);

  // El Escape-para-cerrar de un <dialog> nativo se maneja como su propio evento "cancel" (no
  // burbuja) despachado directo sobre el <dialog>, donde el propio Dialog.tsx ya escucha "cancel"
  // para cerrarse (onCancel={onClose}) vía un listener registrado en el mismo nodo. Para que el
  // popover pueda cerrarse solo (sin cerrar también el diálogo completo), este listener se
  // registra en la fase de CAPTURA sobre `document` — anterior, en el recorrido del evento, al
  // propio <dialog> — y corta la propagación antes de que el evento llegue a Dialog.tsx. Se monta
  // una sola vez (no depende de `addingSection` en las deps del efecto) para evitar una carrera:
  // si se registrara recién al abrir el popover, un Escape inmediatamente después de abrir podría
  // llegar antes de que el efecto termine de adjuntar el listener.
  useEffect(() => {
    const onDocumentCancelCapture = (e: Event) => {
      if (!addingSectionRef.current) return;
      if (!(e.target instanceof Node) || !popoverRef.current?.closest("dialog")?.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      setAddingSection(null);
      addTriggerRef.current?.focus();
    };
    document.addEventListener("cancel", onDocumentCancelCapture, true);
    return () => document.removeEventListener("cancel", onDocumentCancelCapture, true);
  }, []);

  const labelsQuery = workGroupId ? `?groupId=${workGroupId}` : "";

  const loadKeys = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<LabelKeyDto[]>(`/api/labels${labelsQuery}`);
      setKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const openPicker = () => {
    setOpen(true);
    setError("");
    setAddingSection(null);
    void loadKeys();
  };

  const openAdd = (section: "primary" | "secondary", trigger: HTMLButtonElement | null) => {
    addTriggerRef.current = trigger;
    setError("");
    setAddingSection(section);
  };

  const closeAdd = () => setAddingSection(null);

  /** El botón "Agregar etiqueta" queda siempre visible y funciona como toggle
   * (no se oculta ni desaparece mientras su propio panel está abierto). */
  const toggleAdd = (section: "primary" | "secondary", trigger: HTMLButtonElement | null) => {
    if (addingSection === section) closeAdd();
    else openAdd(section, trigger);
  };

  const primaryLabel = labels.find((l) => l.isPrimary) ?? null;
  const secondaryLabels = labels.filter((l) => !l.isPrimary);
  const secondaryAssignedValueIds = secondaryLabels.map((l) => l.valueId);

  // El panel de "Principal" no ofrece la clave-valor ya asignada como principal (no aplica,
  // ya se está mostrando arriba); el de "Secundarias" tampoco (para no duplicar la selección).
  const scopeSectionsFor = (excludeValueId?: string) =>
    (["global", "group", "personal"] as const)
      .map((scope) => ({
        scope,
        keys: keys
          .map((k) => ({ ...k, values: k.values.filter((v) => v.id !== excludeValueId) }))
          .filter((k) => (k.scope ?? "personal") === scope && k.values.length > 0),
      }))
      .filter((section) => section.keys.length > 0);

  const setPrimary = async (keyId: string, valueId: string) => {
    setError("");
    try {
      await api(`/api/works/${workId}/labels/primary`, {
        method: "PUT",
        body: JSON.stringify({ keyId, valueId }),
      });
      onChanged();
      closeAdd();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  const clearPrimary = async () => {
    setError("");
    try {
      await api(`/api/works/${workId}/labels/primary`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  const addSecondary = async (keyId: string, valueId: string) => {
    setError("");
    try {
      await api(`/api/works/${workId}/labels`, {
        method: "PUT",
        body: JSON.stringify({ keyId, valueId }),
      });
      onChanged();
      // el panel se mantiene abierto: se pueden seguir sumando varias de corrido
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  const removeSecondary = async (keyId: string, valueId: string) => {
    setError("");
    try {
      await api(`/api/works/${workId}/labels?keyId=${keyId}&valueId=${valueId}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  /**
   * Popover flotante de selección (ancla: el botón "Agregar etiqueta" de su sección),
   * agrupado por ámbito y clave, sin buscador: un listado vertical, cada valor en su
   * propia fila como pastilla de color ("como si fuera un selector... que me
   * despliegue una lista"). Anclado con position:absolute (no portal) porque el
   * modal contenedor es un <dialog> nativo: un portal a document.body quedaría
   * detrás del top-layer del navegador.
   */
  const renderAddPanel = (section: "primary" | "secondary") => {
    const excludeValueId = section === "secondary" ? primaryLabel?.valueId : undefined;
    const sections = scopeSectionsFor(excludeValueId);
    return (
      <div ref={popoverRef} className="label-picker-add-popover">
        <div className="label-picker-add-popover-head">
          <strong style={{ fontSize: 13 }}>
            {section === "primary"
              ? primaryLabel
                ? "Cambiar etiqueta principal"
                : "Agregar a Principal"
              : "Agregar a Secundarias"}
          </strong>
          <button className="icon-btn" aria-label="Cerrar lista de etiquetas" onClick={closeAdd}>
            <X size={14} />
          </button>
        </div>

        <div className="label-picker-add-popover-body">
          {sections.length === 0 && (
            <p className="muted" style={{ margin: 0 }}>
              No hay etiquetas disponibles.
            </p>
          )}

          {sections.map((s) => (
            <div key={s.scope} style={{ display: "grid", gap: 2 }}>
              <span className="label-picker-scope-label">{scopeLabel[s.scope]}</span>
              {s.keys.map((key) => (
                <div key={key.id} style={{ display: "grid" }}>
                  <span className="label-picker-key-label">{key.name}</span>
                  {key.values.map((v) => {
                    const assigned =
                      section === "primary"
                        ? primaryLabel?.valueId === v.id
                        : secondaryAssignedValueIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        className="menu-item label-picker-value-row"
                        aria-pressed={assigned}
                        onClick={() =>
                          void (section === "primary" ? setPrimary(key.id, v.id) : addSecondary(key.id, v.id))
                        }
                      >
                        <span
                          aria-hidden="true"
                          className="color-dot"
                          style={{ "--c": v.color } as React.CSSProperties}
                        />
                        <span style={{ flex: 1 }}>{v.name}</span>
                        {assigned && <Check size={15} className="label-picker-value-check" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {labels.map((l) => (
        <span
          key={`${l.keyId}-${l.valueId}`}
          className="label-chip color-chip"
          style={{ "--c": l.color } as React.CSSProperties}
        >
          {l.valueName}
        </span>
      ))}
      <button className="icon-btn" aria-label="Etiquetas" onClick={openPicker}>
        <Tag size={16} />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Etiquetas del proyecto" allowOverflow>
        {loading && <p className="muted">Cargando…</p>}

        {!loading && keys.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>
            No hay etiquetas disponibles.
          </p>
        )}

        {!loading && keys.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            <div className="label-picker-section-head" style={{ position: "relative" }}>
              <span className="label-picker-section-title">Principal</span>
              <button
                className="label-admin-add-value"
                aria-expanded={addingSection === "primary"}
                onClick={(e) => toggleAdd("primary", e.currentTarget)}
              >
                {primaryLabel ? <Pencil size={13} /> : <Plus size={13} />}
                {primaryLabel ? "Cambiar etiqueta" : "Agregar etiqueta"}
              </button>
              {addingSection === "primary" && renderAddPanel("primary")}
            </div>
            {primaryLabel && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span
                  className="label-chip color-chip"
                  style={{ "--c": primaryLabel.color, display: "inline-flex", alignItems: "center", gap: 6 } as React.CSSProperties}
                >
                  {primaryLabel.valueName}
                  <button
                    className="icon-btn label-chip-remove"
                    aria-label="Quitar etiqueta principal"
                    onClick={() => void clearPrimary()}
                    style={{ padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              </div>
            )}
          </div>
        )}

        {!loading && keys.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            <div className="label-picker-section-head" style={{ position: "relative" }}>
              <span className="label-picker-section-title">Secundarias</span>
              <button
                className="label-admin-add-value"
                aria-expanded={addingSection === "secondary"}
                onClick={(e) => toggleAdd("secondary", e.currentTarget)}
              >
                <Plus size={13} />
                Agregar etiqueta
              </button>
              {addingSection === "secondary" && renderAddPanel("secondary")}
            </div>
            {secondaryLabels.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {secondaryLabels.map((l) => (
                  <span
                    key={`${l.keyId}-${l.valueId}`}
                    className="label-chip color-chip"
                    style={{ "--c": l.color, display: "inline-flex", alignItems: "center", gap: 6 } as React.CSSProperties}
                  >
                    {l.valueName}
                    <button
                      className="icon-btn label-chip-remove"
                      aria-label={`Quitar ${l.valueName}`}
                      onClick={() => void removeSecondary(l.keyId, l.valueId)}
                      style={{ padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
            {error}
          </p>
        )}
      </Dialog>
    </div>
  );
}
