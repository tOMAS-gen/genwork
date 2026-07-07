# Quickstart: Código de referencia del proyecto

## Prerrequisitos

```bash
npm run dev   # http://localhost:3010
```

(No requiere migración: usa `folderSeq` existente.)

## Escenario 1 — Ver el código en el proyecto (US1, FR-001/002/003)

1. Abrí un proyecto que pertenezca a un grupo (ej. grupo "Farmacia Central", proyecto "Mueble Living").
2. **Esperado**: en un apartado visible se muestra el código, por ejemplo `FARMACIA_CENTRAL-23-MUEBLE_LIVING`, en mayúsculas, con espacios como `_` y partes unidas por `-`.
3. Pulsar **copiar** → **Esperado**: el código queda en el portapapeles.
4. Un proyecto personal (sin grupo) → **Esperado**: el código empieza con `PERSONAL-`.

## Escenario 2 — La carpeta en el almacenamiento usa el código (US2, FR-005)

1. Con un almacenamiento activo (Nextcloud o Google Drive), crear un proyecto nuevo.
2. Mirar la carpeta creada en el almacenamiento.
3. **Esperado**: el nombre de la carpeta del proyecto es el mismo código que muestra la plataforma.

## Escenario 3 — Estabilidad al renombrar (FR-007)

1. Renombrar un proyecto.
2. **Esperado**: la parte `GRUPO-NÚMERO` del código no cambia; la parte del nombre refleja el nombre nuevo. (La carpeta física existente no se renombra.)

## Escenario 4 — Proyectos existentes (FR-006)

1. Abrir un proyecto creado antes de la feature.
2. **Esperado**: muestra su código igual (calculado); su carpeta en el almacenamiento no se renombra.

## Checks automatizados

```bash
npm run lint
npm test        # normalizeSegment (acentos, espacios, caracteres inválidos) y buildProjectCode (ejemplos, PERSONAL, determinismo)
npm run build
```
