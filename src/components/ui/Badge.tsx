/**
 * Reusable numeric badge (feature 054).
 *
 * Rules (per spec FR-016, FR-017, FR-018 and clarify Q2):
 *   - `count === 0` (or nullish) → renders nothing (`null`).
 *   - `count > 999`             → shows "999+" but the aria-label uses the
 *                                 real number (accessibility over visual truncation).
 *   - aria-label = singular for 1, plural for anything else.
 *
 * The pure helper `computeBadgeDisplay` encodes the whole decision so it can
 * be unit-tested in a `node` vitest env without mounting React.
 */

import type { ReactNode } from "react";

export type BadgeDisplay = {
  visible: boolean;
  text: string;
  ariaLabel: string;
};

export type ComputeBadgeDisplayOptions = {
  singular?: string;
  plural?: string;
};

/**
 * Pure derivation of the badge state. Testable in isolation.
 */
export function computeBadgeDisplay(
  count: number | null | undefined,
  { singular, plural }: ComputeBadgeDisplayOptions = {},
): BadgeDisplay {
  if (count == null || count <= 0 || !Number.isFinite(count)) {
    return { visible: false, text: "", ariaLabel: "" };
  }
  const noun = count === 1 ? (singular ?? "tarea no finalizada") : (plural ?? "tareas no finalizadas");
  const text = count > 999 ? "999+" : String(count);
  return {
    visible: true,
    text,
    ariaLabel: `${count} ${noun}`,
  };
}

export type BadgeProps = {
  count: number | null | undefined;
  /** Singular noun (default: "tarea no finalizada") */
  ariaLabelSingular?: string;
  /** Plural noun (default: "tareas no finalizadas") */
  ariaLabelPlural?: string;
  /** Extra className appended after `"badge badge-sm"`. */
  className?: string;
};

/**
 * Renders a pill-shaped numeric badge, or `null` when there is nothing to show.
 */
export function Badge({
  count,
  ariaLabelSingular,
  ariaLabelPlural,
  className,
}: BadgeProps): ReactNode {
  const display = computeBadgeDisplay(count, {
    singular: ariaLabelSingular,
    plural: ariaLabelPlural,
  });
  if (!display.visible) return null;
  const fullClass = className
    ? `badge badge-sm ${className}`
    : "badge badge-sm";
  return (
    <span
      className={fullClass}
      role="status"
      aria-label={display.ariaLabel}
    >
      {display.text}
    </span>
  );
}
