# Quickstart: Validación del fix de etiquetas

## Prerrequisitos

```bash
npm run db:migrate     # aplica 0031_labels_global_scope
npm run dev            # http://localhost:3010
```

Usuarios (DEV_AUTH): admin (super-admin), miembro, lector.

## Escenario 1 — Etiquetas globales visibles en proyecto de grupo (US1, FR-001/002/003)

1. Como **super-admin**, ir a **Administración → Etiquetas**, crear clave global "Prioridad" con valores "Alta"/"Baja".
2. Abrir un proyecto que pertenece a un grupo.
3. Abrir el selector de etiquetas (ícono Tag).
4. **Esperado**: aparece "Prioridad" (global) + las etiquetas del grupo, sin duplicados.

## Escenario 2 — Asignar una etiqueta global (US1, FR-005/R5)

1. En el selector del proyecto de grupo, hacer clic en el valor "Alta" de la clave global.
2. **Esperado**: se asigna sin error 409; el chip "Alta" aparece en el proyecto; al reabrir el selector, "Alta" figura marcada.

## Escenario 3 — Etiqueta de grupo no se filtra a otro grupo (FR-004/014, SC-004)

1. Como admin de **Grupo A**, crear etiqueta de grupo "Etapa A".
2. Abrir un proyecto de **Grupo B**, abrir el selector.
3. **Esperado**: "Etapa A" NO aparece.

## Escenario 4 — Admin de grupo gestiona etiquetas de su grupo (US2, FR-011..013)

1. Como admin de un grupo, ir a la página del grupo `/groups/{id}`.
2. **Esperado**: hay una sección "Etiquetas del grupo" para crear/renombrar/eliminar.
3. Crear "Etapa comercial" con valores; abrir un proyecto de ese grupo → aparece disponible.
4. Como **miembro no-admin**, la sección de gestión no está disponible / las acciones devuelven 403.

## Escenario 5 — Estado vacío informativo (FR-008)

1. En un proyecto sin etiquetas de grupo ni globales, abrir el selector.
2. **Esperado**: mensaje claro "no hay etiquetas disponibles", sin error.

## Escenario 6 — Migración de datos (R6)

1. Antes de migrar: una etiqueta creada por el super-admin desde /admin/labels NO aparece en proyectos de grupo (bug original).
2. Aplicar migración `0031`.
3. **Esperado**: esa etiqueta ahora es global y aparece en todos los proyectos.

## Checks automatizados

```bash
npm run lint
npm test        # incluye: disponibilidad (unión), regla de asignación (acepta global), gate global
npm run build
```
