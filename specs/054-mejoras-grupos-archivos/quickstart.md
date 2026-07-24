# Quickstart: validación de Mejoras de grupos y archivos (054)

## Prerrequisitos

- `npm install`, DB migrada: `npm run db:migrate:dev`
- Dev server: `npm run dev` (http://localhost:3010)
- Storage configurado (Nextcloud vía `NEXTCLOUD_URL` o Drive según `AccessConfig.storageProvider`); sin storage configurado, los flujos de carpeta pueden validarse por tests unitarios.

## Checks automáticos

```bash
npm run lint
npm test        # incluye storage-folder-enable, works-group-filter, mcp-group-list
npm run build
```

## Validación manual por user story

### US1 — Carpetas bajo demanda

1. Crear un proyecto nuevo en un grupo → verificar en el proveedor que NO se creó carpeta; en Archivos, como ADMIN, se ve "Habilitar carpeta"; como MEMBER, un aviso sin acción.
2. Pulsar "Habilitar carpeta" → aparece estado "creando"; al completar el job, el navegador de archivos funciona y la carpeta existe como `grupo/NNN-nombre` con los miembros del grupo con acceso.
3. Repetir el POST de habilitación (doble clic / curl) → una sola carpeta (idempotencia).
4. Dar de baja a un usuario del grupo → job `REMOVE_MEMBER` + `AUDIT_GROUP_PERMISSIONS` encolados; el usuario pierde acceso en Nextcloud.
5. Proyecto personal: mismo flujo, habilita el dueño, solo él accede.
6. Proyecto viejo con carpeta previa → sigue operando igual (migración lo marcó habilitado).

### US2 — Vista de grupo

- Con proyectos en grupos X e Y: entrar a `/groups/<X>` → la sección Proyectos lista SOLO los de X; `curl '/api/works?groupId=<X>'` devuelve solo works de X.

### US3 — Filtro por grupo + pills

- En el dashboard: filtrar por grupo → solo sus proyectos; combinar con filtro de estado → intersección; "Limpiar filtros" → todo visible de nuevo; pills rectangulares con activo/inactivo distinguible.

### US4 — Drawer

- Abrir drawer: proyecto de grupo se ve "Grupo — Nombre"; personal solo "Nombre"; nombre largo trunca sin romper layout.

### US5 — MCP `group.list`

```bash
curl -s -X POST http://localhost:3010/api/mcp \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"group.list","arguments":{}}}'
```

- Con token de usuario normal → solo sus grupos con `role`; con SUPERADMIN → todos.

## Resultados esperados

Todos los criterios SC-001…SC-006 de [spec.md](./spec.md) verificables con los pasos de arriba.
