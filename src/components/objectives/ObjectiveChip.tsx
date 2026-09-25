import Link from "next/link";
import { Flag } from "@/components/ui/icons";
import { objectiveBreadcrumb } from "@/lib/domain/objectives/breadcrumb";
import { objectiveAnchorId } from "./ObjectiveSection";

/**
 * objetivos (crítica I1): chip único del objetivo de una tarea. Un `Link`
 * `.tag.tag-objective` hacia la sección del objetivo en su proyecto
 * (`/works/<id>#objetivo-<oid>`); la página baja hasta ahí y la despliega.
 *
 * Quién lo muestra lo decide `shouldShowObjectiveChip` en `TaskItem`. Este
 * componente solo decide el TEXTO:
 * - Si el proyecto ya se ve junto a la tarea (su propio proyecto, el grupo
 *   del sector por proyecto o el chip `/Proyecto` de la fila), solo el título.
 * - Si no, la forma "Proyecto › Objetivo".
 */
export function ObjectiveChip({
  workId,
  workName,
  objective,
  projectVisible,
}: {
  workId: string;
  workName: string | null;
  objective: { id: string; title: string };
  projectVisible: boolean;
}) {
  const breadcrumb = objectiveBreadcrumb(workName, objective.title);
  const text = projectVisible || !workName ? objective.title : breadcrumb;
  return (
    <Link
      className="tag tag-objective"
      href={`/works/${workId}#${objectiveAnchorId(objective.id)}`}
      title={`Objetivo: ${workName ? breadcrumb : objective.title}`}
    >
      <Flag size={12} aria-hidden="true" />
      <span className="tag-objective-text">{text}</span>
    </Link>
  );
}
