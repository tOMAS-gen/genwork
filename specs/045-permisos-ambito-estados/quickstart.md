# Quickstart: validar permisos de ámbito en estados de tarea

## Prerrequisitos

- App corriendo en dev: `npm run dev` (puerto 3010).
- Base de datos con al menos: un usuario `SUPERADMIN`, un usuario `ADMIN` del Grupo A (no SUPERADMIN), un usuario `MEMBER` del Grupo A sin rol admin y sin ser SUPERADMIN.
- Los tres usuarios con sesión iniciable (ver seed/fixtures existentes del repo, o crear vía admin de usuarios).

## Escenario 1 — ADMIN de grupo (US1)

1. Iniciar sesión como el usuario ADMIN del Grupo A.
2. Ir a `/admin/task-statuses`, seleccionar ámbito "Grupo A" en el selector.
3. **Esperado**: aparecen los controles para agregar estado nuevo, editar nombre/color/tipo, reordenar y eliminar. Crear un estado de prueba y confirmar que se guarda.
4. Cambiar el selector a otro grupo del que este usuario NO es ADMIN.
5. **Esperado**: la lista se ve en modo solo lectura, sin ningún control de creación/edición/reordenamiento/eliminación visible.

## Escenario 2 — Solo SUPERADMIN en Global (US2)

1. Iniciar sesión como SUPERADMIN.
2. Ir a `/admin/task-statuses`, seleccionar ámbito "Global (todos)".
3. **Esperado**: controles de creación/edición visibles y funcionales.
4. Cerrar sesión, iniciar sesión como el ADMIN del Grupo A (no SUPERADMIN).
5. Seleccionar ámbito "Global (todos)".
6. **Esperado**: solo lectura, sin controles de creación/edición.

## Escenario 3 — MEMBER sin rol admin (US3)

1. Iniciar sesión como el MEMBER del Grupo A (sin rol admin, no SUPERADMIN).
2. Seleccionar ámbito "Grupo A".
3. **Esperado**: solo lectura, sin controles.
4. Seleccionar ámbito "Personal".
5. **Esperado**: controles de creación/edición visibles y funcionales (es su propio conjunto).
6. Seleccionar ámbito "Global (todos)".
7. **Esperado**: solo lectura, sin controles.

## Verificación de contrato (opcional, vía API directa)

```bash
# Como MEMBER sin rol admin del Grupo A, pedir el conjunto de ese grupo:
curl -s -H "Cookie: <sesión del MEMBER>" \
  "http://localhost:3010/api/task-statuses?groupId=<id-grupo-a>" | jq .canWrite
# Esperado: false

# Como ADMIN del Grupo A, mismo pedido:
curl -s -H "Cookie: <sesión del ADMIN>" \
  "http://localhost:3010/api/task-statuses?groupId=<id-grupo-a>" | jq .canWrite
# Esperado: true
```

## Backstop de backend (defensa en profundidad, FR-008)

Con la sesión del MEMBER sin rol admin, intentar un `POST` directo contra el ámbito del Grupo A o Global debe seguir devolviendo `403 Forbidden` — este comportamiento ya existe hoy y no debe regresionar.

```bash
curl -s -X POST -H "Cookie: <sesión del MEMBER>" -H "Content-Type: application/json" \
  -d '{"groupId":"<id-grupo-a>","name":"Test","color":"#94a3b8","type":"IN_PROGRESS"}' \
  http://localhost:3010/api/task-statuses
# Esperado: 403 Forbidden
```

## Tests automatizados de referencia

- `src/app/api/task-statuses/route.ts` (o su archivo de test co-ubicado): casos `canWrite` true/false para las 4 combinaciones de rol × ámbito de la tabla en `contracts/task-statuses-api.md`.
- `TaskStatusSettings.tsx` (o su test co-ubicado): no renderiza botones de agregar/editar/reordenar/eliminar cuando la respuesta trae `canWrite: false`.
