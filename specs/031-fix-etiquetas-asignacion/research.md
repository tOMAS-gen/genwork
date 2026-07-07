# Research: Fix — Etiquetas no visibles al asignar

## R1 — Cómo modelar "etiqueta general de administración"

**Decision**: Ámbito **global** = `LabelKey` con `groupId=null` y `ownerId=null`.

**Rationale**: El modelo `LabelKey` ya tiene `groupId` y `ownerId` nullable. El ámbito global (ambos null) es representable sin cambio estructural de tabla. Se distingue limpiamente de:
- Ámbito de grupo: `groupId=X, ownerId=null`
- Ámbito personal: `groupId=null, ownerId=U`
- Ámbito global: `groupId=null, ownerId=null`

**Alternatives considered**:
- *Tratar las personales del super-admin como generales*: rechazado en clarify — acopla el concepto a una cuenta y es el origen del bug.
- *Columna `isGlobal` booleana*: redundante; (null,null) ya expresa el ámbito y mantiene el patrón de scope existente.

## R2 — Unicidad de nombre para etiquetas globales

**Decision**: Unicidad a nivel aplicación (`findFirst({ where: { groupId: null, ownerId: null, name } })` antes de crear), igual que ya se hace para los otros ámbitos.

**Rationale**: Los constraints `@@unique([groupId, name])` y `@@unique([ownerId, name])` no impiden duplicados cuando la columna es NULL (en Postgres `NULL != NULL`). El código de POST ya valida duplicado por ámbito con `findFirst`; se extiende al ámbito global. Evita un índice parcial adicional (simplicidad).

**Alternatives considered**:
- *Índice único parcial `WHERE groupId IS NULL AND ownerId IS NULL`*: más robusto pero agrega complejidad de migración; el volumen es bajo y la validación de app basta.

## R3 — Visibilidad de globales sin tocar el motor de permisos

**Decision**: Resolver la unión de etiquetas disponibles en la capa de endpoints de etiquetas, con una función pura `labelAvailabilityScopes()`; NO modificar `access()` del motor de permisos core.

**Rationale**: `access(user, scope)` retorna `"none"` para (null,null), y es usado por muchos recursos (works, sectores, tareas). Cambiarlo para tratar (null,null) como visible-por-todos arriesga fugas en otros recursos. Las etiquetas globales son "visibles por todos" solo en el dominio de etiquetas; se maneja ahí.

**Alternatives considered**:
- *Modificar `access()`*: rechazado por riesgo transversal (Principio V, no romper lo que funciona).

## R4 — Conjunto de etiquetas disponibles al asignar (GET /api/labels)

**Decision**: El listado devuelve la **unión sin duplicados**:
- Siempre: etiquetas globales (`groupId=null, ownerId=null`).
- Si el proyecto pertenece a un grupo (`?groupId=X` con acceso): + etiquetas del grupo X.
- Si el proyecto es personal / sin grupo (sin `?groupId`): + etiquetas personales del usuario.

Cada clave devuelta incluye `scope: "global" | "group" | "personal"` para permitir US3 (distinguir origen) y ordenar (globales primero o al final, definido en UI).

**Rationale**: Cumple FR-001/002/003/007. El `scope` en la respuesta habilita la distinción de origen sin llamadas extra.

## R5 — Regla de asignación (PUT /api/works/{id}/labels)

**Decision**: Reemplazar la validación estricta de ámbito por: **aceptar si la etiqueta es global O su ámbito coincide con el del proyecto**.

```
esGlobal = key.groupId === null && key.ownerId === null
mismoAmbito = key.groupId === work.groupId && key.ownerId === work.ownerId
if (!esGlobal && !mismoAmbito) → conflict
```

**Rationale**: Corrige FR-005. Sin esto, aunque el picker mostrara las globales, la asignación fallaría con 409. Mantiene el rechazo de etiquetas de otro grupo (FR-004/014).

## R6 — Migración de datos de etiquetas existentes

**Decision**: Migración que convierte a global (`ownerId=null`) las `LabelKey` con `groupId=null` cuyo `ownerId` pertenece a un usuario con `globalRole='SUPERADMIN'`.

**Rationale**: Esas etiquetas fueron creadas desde `/admin/labels` con la intención de ser "generales". Migrarlas las vuelve visibles en todos los proyectos, que es exactamente lo que el usuario reporta como faltante. Post-migración, `/admin/labels` crea directamente globales.

**Riesgo/di mitigación**: Si un super-admin tuviera etiquetas personales legítimas (no generales), se volverían globales. Dado que el único punto de creación de personales del super-admin es el panel de admin (cuya intención ES general), el riesgo es mínimo. Se documenta en quickstart para verificación manual antes de aplicar en producción.

**Alternatives considered**:
- *No migrar*: dejaría el bug reportado sin resolver para las etiquetas ya existentes.
- *Migración interactiva/selectiva*: sobre-ingeniería para el volumen actual.

## R7 — Gestión de etiquetas de grupo (US2)

**Decision**: Parametrizar el componente `LabelAdmin` por ámbito (`{ groupId }` o global) y montarlo en la página del grupo `/groups/[id]` visible solo para administradores del grupo. El backend ya soporta crear/editar etiquetas de grupo (POST `/api/labels` con `groupId`, gate `requireLabelAdmin` → `canManageGroup`).

**Rationale**: Cumple US2/FR-011..014 reutilizando backend y componente existentes. No requiere entidades ni endpoints nuevos, solo exponer la UI y pasar el `groupId`.

**Alternatives considered**:
- *Gestión inline en el LabelPicker*: el componente lo insinúa en comentarios pero mezclaría asignación con administración; una sección dedicada en el grupo es más clara y respeta el gate por grupo.
