# Quickstart — Validación end-to-end de la feature 054

**Feature**: Contadores de tareas no finalizadas y ordenamiento en el drawer

## Prerequisitos

- Base de datos poblada con al menos:
  - 3 grupos (p.ej. "Cliente ACME", "Cliente BETA", "Interno") con al menos 1 sector cada uno.
  - 5 sectores distribuidos entre esos grupos, con distinta cantidad de tareas.
  - 3 proyectos (works) con distinta carga: 1 con 0 pendientes, 1 con pocas, 1 con muchas.
  - Al menos 1 tarea con `status.type = FINAL` y al menos 1 tarea con `status.type = IN_PROGRESS` en varios sectores/works.
  - 1 work con `status = ARCHIVED` (para verificar que NO aparece ni cuenta).
  - 1 work con `isTemplate = true` (para verificar exclusión).

## Setup

```powershell
# Instalar dependencias (si no hecho aún)
npm install

# Aplicar migraciones (no hay nuevas en esta feature, pero mantener la base al día)
npx prisma migrate dev

# (opcional) Semillar datos de prueba si existe seed
npx prisma db seed
```

## Correr tests unit + contract de esta feature

```powershell
# Todos los tests
npx vitest run

# Solo los de esta feature
npx vitest run tests/unit/unfinished-count.test.ts tests/unit/drawer-sort.test.ts `
  src/app/api/sectors/__tests__/sectors.test.ts `
  src/app/api/works/__tests__/works.test.ts `
  src/app/api/groups/__tests__/groups.test.ts
```

**Expected**: todos los tests en verde, incluyendo los contract tests documentados en `contracts/*.md`.

## Verificación manual (dev server)

```powershell
npm run dev
# abrir http://localhost:3000
```

Entrar al workspace con un usuario que vea al menos 3 sectores, 3 proyectos y 2 grupos.

### Escenario 1 — Contadores visibles y correctos por ítem (US1)

1. Observar el drawer. Cada sector, proyecto y grupo con tareas no finalizadas DEBE mostrar un badge con el número al lado derecho de su nombre.
2. Contra-verificar contra el dashboard de sector (`/sectors/[id]`): la cifra del sector en el drawer coincide con `pending` del dashboard.

**Pasa si**: sin discrepancias entre el drawer y las vistas de detalle.

### Escenario 2 — Total por título de sección (US2)

1. Sumar mentalmente (o con calculadora) los badges de todos los sectores visibles.
2. Comparar con el badge junto al título "Sectores".

**Pasa si**: el total del título es EXACTAMENTE la suma de los individuales de esa sección. Repetir para "Proyectos" y "Grupos".

Nota: el drawer solo muestra los primeros 10 items por sección (`CAP = 10`), pero el total del título suma **todos** los que el usuario ve, no solo los 10 mostrados (R-004).

### Escenario 3 — Orden por mayor pendiente (US3)

1. Observar la sección "Sectores": el primero DEBE ser el sector con más tareas no finalizadas; el último, el que tenga menos (o los que tengan 0, si los mostramos — ver Escenario 4).
2. Repetir para "Proyectos" y "Grupos".
3. Con dos sectores/proyectos empatados en cifra, el orden entre ellos DEBE ser alfabético ascendente por nombre.

**Pasa si**: todas las secciones respetan el orden desc por `pendingCount`, con desempate alfabético.

### Escenario 4 — Ítems en 0 no muestran badge

1. Identificar un sector/proyecto/grupo cuyo `pendingCount = 0`.
2. Verificar que aparece en el drawer sin badge (solo el nombre).
3. Si TODA una sección está en 0, verificar que el título de sección tampoco muestra badge.

**Pasa si**: cero badges renderizados donde count === 0.

### Escenario 5 — Refresh automático (SC-005)

1. Abrir el drawer y anotar el `pendingCount` de un sector S.
2. En otra pestaña (o abriendo el detalle) marcar como FINAL una tarea de S.
3. Volver a la pestaña del drawer sin recargar.

**Pasa si**: el badge de S baja en 1 y, si corresponde por ordenamiento, S se reordena. Todo esto sin `Ctrl+R`.

### Escenario 6 — Latencia percibida (SC-004, ≤ 200 ms)

1. Abrir devtools > Network, con la caché desactivada, y filtrar por `/api/sectors|/api/works|/api/groups`.
2. Refrescar la página.

**Pasa si**: cada endpoint responde en < 100 ms en dev local con base poblada de tamaño representativo (miles de tareas); la percepción de "instantáneo" al abrir el drawer se cumple.

### Escenario 7 — Accesibilidad (Principio V)

1. Inspeccionar un badge con devtools.
2. Verificar que expone `aria-label` con formato `"{n} tareas no finalizadas"` (o `"1 tarea no finalizada"` en singular).
3. Verificar contraste ≥ 4.5:1 en light y dark theme.
4. Navegar el drawer con Tab; los ítems mantienen foco visible y anuncian el contador vía screen reader (VoiceOver / NVDA rápida verificación).

**Pasa si**: sin regresiones AA.

## Rollback

Sin cambios de schema, sin migraciones. Rollback = revertir el commit; los endpoints vuelven a no exponer `pendingCount` en works/groups (sectors ya lo tenía y sigue igual) y el drawer vuelve a no mostrar badges.

## Referencias

- Spec: `spec.md`
- Plan: `plan.md`
- Contratos: `contracts/sectors-api.md`, `contracts/works-api.md`, `contracts/groups-api.md`
- Data model derivado: `data-model.md`
