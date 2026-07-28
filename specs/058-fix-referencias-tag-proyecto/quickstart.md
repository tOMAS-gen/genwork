# Quickstart: Ocultar chip de proyecto redundante en Referencias del sector

**Feature**: `058-fix-referencias-tag-proyecto` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Prerequisitos

- Dependencias instaladas (`npm install`) y base de datos local levantada según el setup habitual del repo.
- App corriendo en desarrollo: `npm run dev`.

## Validación automatizada

```powershell
npx vitest run tests/unit/references-grouping.test.ts tests/unit/task-suppress-work-tag.test.ts
```

**Resultado esperado**: todos los tests en verde, incluidos los nuevos de `referenceTaskContext`:
- encabezado `work` → `suppressWorkTag: true`
- encabezado `sector` → sin `suppressWorkTag`

## Validación manual end-to-end

1. **Setup**: Crear (o reusar) un sector A con una tarea de otro sector B que referencie a A (`#A` en su texto) y que pertenezca a un proyecto P. Crear también una referencia sin proyecto.
2. **Caso P1 (SC-001)**: Abrir `/sectors/{idA}` y bajar al apartado **Referencias**.
   - ✅ Bajo el título del proyecto P, la tarea NO muestra el chip `/P` en su texto.
   - ✅ El título del grupo sigue mostrando el nombre del proyecto P (FR-002).
3. **Caso P2 (SC-002)**: En el mismo apartado, el grupo encabezado por un sector (referencia sin proyecto) se ve exactamente igual que antes del cambio.
4. **Regresión (FR-005)**:
   - La sección "Tareas del sector" se comporta igual que antes (tareas bajo título de proyecto sin chip, igual que siempre).
   - Completar una referencia desde el apartado sigue funcionando (checkbox / casilla de estado).
   - Entrar en modo edición sobre una referencia no muestra cambios de comportamiento.
5. **Criterio global (SC-003)**: Recorrer `/references` ("Mis referencias") y la vista de un proyecto (`/works/{id}`) confirmando que su presentación no cambió.

## Artefactos de referencia

- Regla de visibilidad del chip: `src/lib/domain/tasks/workTagVisibility.ts` (sin cambios; ver `tests/unit/task-suppress-work-tag.test.ts`).
- Función de decisión nueva: `referenceTaskContext` en `src/components/tasks/groupReferencesBySource.ts` (ver [data-model.md](./data-model.md)).
