/**
 * `FileShare.path` guarda la ruta absoluta del proveedor. Cuando un elemento
 * cambia de ruta (se renombra o archiva el proyecto, o se renombra un archivo
 * desde el visor), el share en Nextcloud lo sigue por file id pero la fila en
 * la base quedaría apuntando a la ruta vieja y el acceso dejaría de listarse.
 * Esto re-basa las rutas de los shares del elemento y de todo lo que contiene.
 */

import { prisma } from "@/lib/db/client";

export async function rebaseFileShares(workId: string, fromPath: string, toPath: string): Promise<void> {
  if (fromPath === toPath) return;
  const shares = await prisma.fileShare.findMany({
    where: { workId, OR: [{ path: fromPath }, { path: { startsWith: `${fromPath}/` } }] },
    select: { id: true, path: true },
  });
  for (const share of shares) {
    await prisma.fileShare.update({
      where: { id: share.id },
      data: { path: toPath + share.path.slice(fromPath.length) },
    });
  }
}
