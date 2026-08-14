/**
 * Formas que el portal de cliente consume desde /api/portal (feature 059).
 *
 * Espejo del contrato de contracts/portal-api.md. Deliberadamente NO incluyen
 * ruta de carpeta en la nube, código interno, grupo, adjuntos ni nivel de acceso:
 * si un campo prohibido no está en el tipo, no puede colarse en la interfaz.
 */

export interface PortalLabel {
  valueName: string;
  color: string;
  isPrimary: boolean;
}

export interface PortalWorkSummary {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  stage: { name: string; color: string | null } | null;
  labels: PortalLabel[];
  taskCounts: { done: number; total: number };
  pct: number;
}

export interface PortalTaskLink {
  type: "EXEC" | "REF";
  targetType: "SECTOR" | "USER";
  name: string;
  color: string | null;
}

export interface PortalTask {
  id: string;
  displayText: string;
  rawText: string;
  description: string | null;
  dueDate: string | null;
  position: number;
  status: { name: string; color: string; type: "IN_PROGRESS" | "FINAL" };
  links: PortalTaskLink[];
  labels: { valueName: string; color: string }[];
}

export interface PortalWorkDetail extends PortalWorkSummary {
  tasks: PortalTask[];
  doc: { content: unknown } | null;
}

export interface PortalActivityEntry {
  id: string;
  taskId: string;
  taskText: string;
  from: { name: string; color: string } | null;
  to: { name: string; color: string } | null;
  at: string;
}
