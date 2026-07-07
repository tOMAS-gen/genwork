# Tasks: Código de referencia legible de la carpeta del proyecto

**Input**: Design documents from `specs/035-codigo-referencia-carpeta/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/project-code.md

## Format: `[ID] [P?] [Story] [model] Description`

---

## Phase 1: Foundational — Función pura del código (BLOQUEA US1 y US2)

- [X] T001 [sonnet] Crear `src/lib/domain/works/projectCode.ts` (puro, sin I/O): `normalizeSegment(s: string): string` (trim + MAYÚSCULAS, quitar acentos con NFD, espacios→`_`, cualquier carácter fuera de `[A-Z0-9_]`→`_`, colapsar `_` repetidos, sin `_` al inicio/fin) y `buildProjectCode(groupName: string | null | undefined, folderSeq: number, workName: string): string` = `${normalizeSegment(groupName ?? "PERSONAL")}-${folderSeq}-${normalizeSegment(workName)}`. Seguir el estilo de otros módulos de `src/lib/domain/**`.
- [X] T002 [P] [sonnet] Tests en `src/lib/domain/works/__tests__/projectCode.test.ts` (Vitest): los ejemplos de `contracts/project-code.md` (Farmacia Central/23/Mueble Living → `FARMACIA_CENTRAL-23-MUEBLE_LIVING`; null→`PERSONAL-5-NOTAS`; acentos `Ñandú`/`café & té`; espacios múltiples; `-` dentro del nombre → `_`), determinismo, y que el número va sin ceros.

---

## Phase 2: User Story 1 — Ver el código en el proyecto (Priority: P1) 🎯 MVP

**Goal**: El proyecto muestra su código de referencia, copiable.

**Independent Test**: Abrir un proyecto y ver el código; copiarlo.

- [X] T003 [US1] [sonnet] En `src/app/api/works/[id]/route.ts` (GET) incluir `code: buildProjectCode(work.group?.name ?? null, work.folderSeq, work.name)` en el DTO del work. Verificar que la query ya trae `group.name` y `folderSeq` (agregarlos al `select`/`include` si faltan).
- [X] T004 [US1] [sonnet] En `src/app/(main)/works/[id]/page.tsx` agregar al tipo `WorkFull` el campo `code: string` y mostrar un **apartado** (bajo el encabezado o en la pestaña Archivos) con la etiqueta "Código / carpeta", el `code` en monoespaciado y un botón **copiar** (usa `navigator.clipboard.writeText` + confirmación breve). Solo lectura. Seguir el estilo visual del proyecto.

**Checkpoint**: US1 = el código visible y copiable (MVP).

---

## Phase 3: User Story 2 — La carpeta usa el código como nombre (Priority: P2)

**Goal**: La carpeta del proyecto en el almacenamiento se crea con el código.

**Independent Test**: Crear un proyecto con storage activo y ver que la carpeta se llama con el código.

- [X] T005 [US2] [sonnet] En `src/app/api/works/route.ts` (POST), tras crear el `work` (que ya tiene `folderSeq`), resolver el `groupName` (consultar el grupo por `scope.groupId` si existe) y calcular `code = buildProjectCode(groupName, work.folderSeq, name)`; en el `enqueue({ kind: "CREATE_WORK_FOLDER", ... })` pasar `workName: code` (en vez del nombre pelado) para que el proveedor cree la carpeta del proyecto con el código como nombre. No cambiar la firma del endpoint ni el resto del payload.

---

## Phase 4: Polish & Verificación

- [X] T006 [haiku] Ejecutar `npm run lint`, `npm test` y `npm run build`; validar los escenarios de `quickstart.md` que no requieran almacenamiento real (código visible y copiable en un proyecto de grupo y en uno personal). Corregir lo que falle.

---

## Dependencies & Execution Order

- **Phase 1**: T001 → T002 [P]. BLOQUEA US1 y US2 (ambas usan `buildProjectCode`).
- **Phase 2 (US1)**: T003 (usa T001) → T004 (muestra el `code` del DTO).
- **Phase 3 (US2)**: T005 (usa T001). Independiente de US1 (archivo distinto: works/route.ts vs works/[id]/route.ts).
- **Phase 4**: T006 al final.

### Parallel Opportunities

- T002 en paralelo a US1/US2 una vez creado T001.
- US1 (T003/T004) ‖ US2 (T005) — archivos distintos, ambos dependen solo de T001.

### MVP Scope

**US1 (Phase 1 + 2)** entrega el valor central: ver y copiar el código en el proyecto. US2 (nombre de carpeta) es el incremento que cierra la búsqueda desde el Drive.
