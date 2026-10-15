import {
  Badge as GenBadge,
  computeBadgeDisplay as genComputeBadgeDisplay,
  type BadgeDisplay,
  type BadgeProps,
  type ComputeBadgeDisplayOptions,
} from "@gen/ui";

// Badge de @gen/ui con los sustantivos por defecto de genwork (tareas no finalizadas).
const SINGULAR = "tarea no finalizada";
const PLURAL = "tareas no finalizadas";

export type { BadgeDisplay, BadgeProps, ComputeBadgeDisplayOptions };

export function computeBadgeDisplay(
  count: number | null | undefined,
  { singular, plural }: ComputeBadgeDisplayOptions = {},
): BadgeDisplay {
  return genComputeBadgeDisplay(count, { singular: singular ?? SINGULAR, plural: plural ?? PLURAL });
}

export function Badge({ ariaLabelSingular, ariaLabelPlural, ...props }: BadgeProps) {
  return <GenBadge {...props} ariaLabelSingular={ariaLabelSingular ?? SINGULAR} ariaLabelPlural={ariaLabelPlural ?? PLURAL} />;
}
