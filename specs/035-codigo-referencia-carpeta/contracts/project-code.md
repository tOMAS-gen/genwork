# Contract: Código de referencia del proyecto

## Función pura `src/lib/domain/works/projectCode.ts`

```ts
normalizeSegment(s: string): string
buildProjectCode(groupName: string | null | undefined, folderSeq: number, workName: string): string
```

Ejemplos (para tests):
| groupName | folderSeq | workName | → código |
|-----------|-----------|----------|----------|
| "Farmacia Central" | 23 | "Mueble Living" | `FARMACIA_CENTRAL-23-MUEBLE_LIVING` |
| null | 5 | "Notas" | `PERSONAL-5-NOTAS` |
| "Grupo Ñandú" | 100 | "café & té" | `GRUPO_NANDU-100-CAFE_TE` (acentos removidos, `&` fuera) |
| "  Doble  Espacio " | 1 | "a-b" | `DOBLE_ESPACIO-1-A_B` o `A-B`→según regla de `-` en nombre (ver nota) |

Nota: dentro de un segmento, el `-` no es separador (los separadores son solo los dos `-` que unen las 3 partes); si el nombre del proyecto trae `-`, la normalización lo trata como carácter no permitido → `_` (para no confundir con los separadores). Documentar la elección en el test.

## API

### GET /api/works/[id]
El DTO del work incluye un campo nuevo:
```json
{ "...": "...", "code": "FARMACIA_CENTRAL-23-MUEBLE_LIVING" }
```
Calculado con `buildProjectCode(group?.name ?? null, folderSeq, name)`. Solo lectura.

### POST /api/works
Sin cambio de firma. Internamente: tras crear el work, encola `CREATE_WORK_FOLDER` con `workName` = el código (en vez del nombre pelado), de modo que la carpeta del proyecto en el almacenamiento se cree con el código como nombre.

## UI — vista del proyecto (`works/[id]/page.tsx`)
Un apartado visible (por ejemplo bajo el encabezado o en la pestaña Archivos) que muestra:
- Etiqueta "Código / carpeta" + el `code` en formato monoespaciado.
- Botón **copiar** (clipboard) con confirmación breve.
