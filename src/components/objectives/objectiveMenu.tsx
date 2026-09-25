import type { MenuItem } from "@/components/ui/Menu";
import { ArrowDown, ArrowUp, BookTemplate, Pencil, Trash2 } from "@/components/ui/icons";

/**
 * objetivos: ítems del menú ⋮ de un objetivo, en el orden del plan (§5):
 * Editar…, Subir, Bajar, Guardar como plantilla, Eliminar objetivo….
 * Subir/Bajar se deshabilitan en los bordes (siguen visibles para que el menú
 * no cambie de forma según el lugar del objetivo).
 */
export function buildObjectiveMenuItems({
  isFirst,
  isLast,
  onEdit,
  onMoveUp,
  onMoveDown,
  onSaveAsTemplate,
  onDelete,
}: {
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
}): MenuItem[] {
  return [
    { label: "Editar…", icon: <Pencil size={16} />, onSelect: onEdit },
    { label: "Subir", icon: <ArrowUp size={16} />, onSelect: onMoveUp, disabled: isFirst },
    { label: "Bajar", icon: <ArrowDown size={16} />, onSelect: onMoveDown, disabled: isLast },
    { label: "Guardar como plantilla", icon: <BookTemplate size={16} />, onSelect: onSaveAsTemplate },
    { label: "Eliminar objetivo…", icon: <Trash2 size={16} />, onSelect: onDelete, danger: true },
  ];
}
