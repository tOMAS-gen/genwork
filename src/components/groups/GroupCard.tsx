import Link from "next/link";

export interface GroupCardData {
  id: string;
  name: string;
  color: string | null;
  publicRead: boolean;
  _count: { sectors: number; works: number };
  memberships: { user: { email: string } }[];
}

export function GroupCard({ group }: { group: GroupCardData }) {
  const colorClass = group.color ? `label-${group.color.toLowerCase()}` : "pc-name-pill-default";

  return (
    <Link href={`/groups/${group.id}`} className="project-card">
      <div className="card-header">
        <span className={`pc-name-pill ${colorClass}`}>
          {group.name.toUpperCase()}
        </span>
        {group.publicRead && (
          <span className="tag tag-ref" style={{ fontSize: "var(--text-xs)" }}>pública</span>
        )}
      </div>

      <div className="pc-group">
        {group.memberships.length} miembros · {group._count.sectors} sectores · {group._count.works} proyectos
      </div>
    </Link>
  );
}
