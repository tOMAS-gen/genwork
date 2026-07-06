import Link from "next/link";

/**
 * Migas de pan (feature 008, T004).
 * Server Component: solo renderiza links, sin interactividad.
 */

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: "var(--text-sm)" }}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-1)",
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={`${item.label}-${i}`}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}
            >
              {i > 0 && (
                <span aria-hidden="true" style={{ color: "var(--border)" }}>
                  /
                </span>
              )}
              {!isLast && item.href ? (
                <Link href={item.href} style={{ color: "var(--muted)" }}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} style={{ color: "var(--muted)" }}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
