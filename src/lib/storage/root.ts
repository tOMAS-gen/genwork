/**
 * Carpeta raíz de la empresa en la nube: `GENWORK_<EMPRESA>`. La empresa se
 * define por instalación con la variable de entorno `GENWORK_ORG` (se setea en
 * el contenedor). Adentro cuelgan las carpetas de grupo, las personales (por
 * email) y `_archivados/` con la misma organización.
 *
 * Sin `GENWORK_ORG` devuelve `null` y los providers conservan la estructura
 * previa (`/genwork`, `/genwork-personal`, raíz del Drive) para no romper
 * instalaciones existentes.
 */

import { folderSegment } from "./paths";

export function storageRootName(): string | null {
  const org = folderSegment(process.env.GENWORK_ORG ?? "");
  return org ? `GENWORK_${org}` : null;
}
