"use client";

import { useRouter } from "next/navigation";
import { Menu } from "@/components/ui/Menu";
import { Menu as MenuIcon, FolderOpen, Settings } from "@/components/ui/icons";

/**
 * Navegación compacta del dashboard (FR-108): menú plegado para volver/navegar.
 * No se renderiza para rol Lector (pantalla limpia de TV) — el board decide.
 */
export function BoardNav() {
  const router = useRouter();
  const items = [
    {
      label: "Volver a Proyectos",
      icon: <FolderOpen size={16} />,
      onSelect: () => router.push("/"),
    },
    {
      label: "Sectores",
      icon: <Settings size={16} />,
      onSelect: () => router.push("/sectors"),
    },
  ];
  return (
    <div className="board-nav">
      <Menu items={items} label="Navegación" trigger={<MenuIcon size={20} />} />
    </div>
  );
}
