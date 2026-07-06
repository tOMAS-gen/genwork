import { BoardGrid } from "@/components/board/BoardGrid";

/**
 * Dashboard dentro del shell autenticado (feature 004, US3, FR-307): mismo
 * drawer que el resto de la app, sin menú hamburguesa flotante. El rol Lector
 * nunca llega acá — el layout del grupo lo redirige a /tv.
 */
export default function BoardPage() {
  return (
    <div>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 var(--space-4)" }}>Vista de tareas</h1>
      <BoardGrid />
    </div>
  );
}
