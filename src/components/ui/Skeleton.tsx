/**
 * Skeleton de carga (feature 008, T003).
 * Placeholder presentacional con shimmer animado (@keyframes skeleton-shimmer
 * en globals.css). Sin estado ni handlers: no necesita "use client".
 */

export type SkeletonProps = {
  width?: string;
  height?: string;
  variant?: "text" | "card" | "circle";
};

export function Skeleton({ width, height, variant = "text" }: SkeletonProps) {
  return (
    <div
      className={`skeleton skeleton-${variant}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
