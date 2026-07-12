# Quickstart: validar el servidor MCP de Genwork

Guía para probar el feature end-to-end de forma manual (no hay harness de integración de DB
en este proyecto — ver `research.md` §7). Usa el modo de autenticación de prueba local ya
existente en Genwork (`DEV_AUTH=true`), sin depender de Google OAuth real.

## Prerrequisitos

- Repo con dependencias instaladas (`npm install`, incluye la nueva dependencia
  `@modelcontextprotocol/sdk`).
- `DEV_AUTH=true` en `.env` (usuarios de prueba: `admin`, `miembro`, `lector` — ver
  `src/server/auth.ts`).
- Migración de Prisma aplicada con los 3 modelos nuevos: `npm run db:migrate:dev`.
- Servidor corriendo: `npm run dev` (puerto 3010).

## 1. Vincular un "asistente" (generar credencial)

1. Iniciar sesión en `http://localhost:3010/login` como usuario de prueba `miembro`.
2. Ir a la pantalla "Asistentes conectados" y crear una conexión nueva con label
   `"Quickstart test"`.
3. Copiar el token devuelto (`token`) — solo se muestra esta vez.

**Validación equivalente por API** (si la UI todavía no está lista):

```bash
curl -s -b <cookie-de-sesión> -X POST http://localhost:3010/api/me/mcp-connections \
  -H "Content-Type: application/json" \
  -d '{"label":"Quickstart test"}'
# Esperado: 200 con { id, label, token }
```

## 2. Llamar al MCP como ese usuario

```bash
TOKEN="<el token del paso 1>"

curl -s -X POST http://localhost:3010/api/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"connection.whoami","arguments":{}}}'
```

**Esperado**: respuesta JSON-RPC con el email/rol del usuario `miembro` (el mismo que la
sesión web), confirmando FR-009 (identidad heredada, no cuenta de servicio propia).

## 3. Flujo feliz — proyecto completo sin usar la web (SC-001)

Con el mismo `TOKEN`, en orden:

1. `work.create` con `{ name: "Mueble living", groupId: "<grupo del que miembro es integrante>" }`
   → devuelve un `workId`.
2. `task.create` con `{ text: "Cortar chapa #Metalurgica /Mueble living", workId }` →
   verificar en la web que la tarea aparece en el proyecto **y** en la vista del sector
   Metalúrgica (Principio I — misma tarea, dos vistas).
3. `label.assign` con `{ targetType: "work", targetId: workId, key: "prioridad",
   value: "urgente" }` → verificar que la etiqueta aparece en la web.
4. `reminder.create` con fecha próxima, `linkType`/`linkId` apuntando al `workId` →
   verificar que aparece en el calendario/campanita.

**Esperado**: los 4 pasos se completan sin abrir la web hasta el paso de verificación; cada
cambio es visible en la interfaz web en segundos (SC-004).

## 4. Permisos (FR-008, SC-002)

Repetir el paso 3.1 (`work.create`) apuntando a un `groupId` del que `miembro` **no** es
integrante.

**Esperado**: error de permisos (mismo mensaje que devolvería la web), el proyecto no se
crea.

## 5. Confirmación de dos pasos (FR-012, SC-005)

1. Llamar `work.delete` con `{ workId }` (sin `confirmationToken`).
   **Esperado**: `{ status: "confirmation_required", confirmationToken, summary, expiresAt }`
   — el proyecto sigue existiendo.
2. Llamar de nuevo `work.delete` con el mismo `workId` + el `confirmationToken` recibido.
   **Esperado**: el proyecto se borra.
3. Repetir el paso 1, esperar más de 5 minutos, e intentar confirmar con ese
   `confirmationToken` vencido.
   **Esperado**: error (token expirado), nada se ejecuta.

## 6. Auditoría visible (FR-010)

Después del paso 3, abrir el proyecto "Mueble living" en la web.

**Esperado**: la actividad reciente del proyecto muestra las acciones hechas vía MCP (crear
tarea, asignar etiqueta), identificando que vinieron del asistente de `miembro`.

## 7. Revocación (FR-009b, SC-006)

1. Desde la web (sesión de `miembro`), revocar la conexión "Quickstart test".
2. Repetir la llamada del paso 2 (`connection.whoami`) con el mismo `TOKEN`.

**Esperado**: error de autenticación — el token ya no sirve, sin excepciones.
