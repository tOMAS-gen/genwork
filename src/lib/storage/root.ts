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
  return rootNameFor(process.env.GENWORK_ORG);
}

/**
 * `GENWORK_<EMPRESA>` para un nombre de empresa dado, o `null` si está vacío.
 * Google Drive permite que el admin defina la empresa desde el panel
 * (`storageConfig.orgName`), con `GENWORK_ORG` como valor por defecto.
 */
export function rootNameFor(org: string | null | undefined): string | null {
  const segment = folderSegment(org ?? "");
  return segment ? `GENWORK_${segment}` : null;
}
