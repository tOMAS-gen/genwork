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
  /** 062-subtareas: id de la tarea padre, o null si es de nivel raíz. */
  parentId: string | null;
  /** 062-subtareas: `displayText` del padre, o null (sin padre). */
  parentText: string | null;
  /** 062-subtareas: hijas anidadas — mismo shape, sin subtareas propias. */
  subtasks: PortalTask[];
  subtaskCount: number;
  subtaskDone: number;
}

/**
 * objetivos (D11): un objetivo del proyecto con su progreso (regla de
 * contenedor) y sus tareas. Sin posición, plantilla de origen ni autor.
 */
export interface PortalObjective {
  id: string;
  title: string;
  description: string | null;
  taskCounts: { done: number; total: number };
  pct: number;
  tasks: PortalTask[];
}

export interface PortalWorkDetail extends PortalWorkSummary {
  /** objetivos: solo las tareas generales (sin objetivo). */
  tasks: PortalTask[];
  /** objetivos: en orden; `[]` si el proyecto no tiene. */
  objectives: PortalObjective[];
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
