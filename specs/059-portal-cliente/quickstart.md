# Quickstart — 059 Portal de cliente

## Prerrequisitos

- PostgreSQL corriendo y `DATABASE_URL` configurada.
- `DEV_AUTH=true` en `.env` para poder entrar con las cuentas de prueba sin Google.
- Migraciones aplicadas: `npm run db:migrate` (o `npm run db:migrate:dev` en local).
- `npm run dev`.

## Validación automatizada

```bash
npm test                       # 656 tests
npm run lint                   # 1 error preexistente en src/components/editor/slashCommand.ts:35
npx tsc --noEmit               # sin errores nuevos (9 preexistentes en canwrite-*.test.ts)
npm run build                  # verifica que el middleware compile para el runtime del borde
```

Suites que cubren esta feature en particular:

```bash
npx vitest run src/lib/domain/permissions/__tests__/clientAccess.test.ts   # motor: 27 casos
npx vitest run src/lib/domain/access/__tests__/portalPaths.test.ts         # gate del borde
npx vitest run src/app/api/__tests__/client-denied.test.ts                 # suite negativa
npx vitest run src/app/api/portal/__tests__/portal-works.test.ts           # contrato del portal
npx vitest run src/app/api/admin/__tests__/clients.test.ts                 # alta de clientes
npx vitest run src/app/api/works/__tests__/client-grants.test.ts           # otorgamientos
npx vitest run src/lib/storage/__tests__/queue-client.test.ts              # sin carpeta en la nube
```

## Validación manual end-to-end

Cuentas de prueba (con `DEV_AUTH=true`, en `/login`): **admin**, **miembro**, **lector**, **cliente**.

### E1 — Agregar un cliente desde el grupo (US1)

1. Entrar como **admin**, o como un miembro que sea **ADMIN de un grupo**, y abrir `/groups/<id>` de ese grupo.
2. Sección **Clientes del grupo** → **Agregar cliente**: correo `cliente@test.local`, nombre `Cliente de prueba`, y tildar uno o más proyectos del grupo → **Agregar cliente**.
3. **Esperado**: el cliente aparece abajo con estado **Invitado** y con esos proyectos tildados.

> El correo de la cuenta de prueba tiene que ser exactamente `cliente@test.local` para que el ingreso de desarrollo lo encuentre. Con Google real, el correo es el que el cliente haya entregado.

### E1b — Cambiar los proyectos que ve (US1, FR-009c)

1. En la misma sección, destildar un proyecto y tildar otro.
2. **Esperado**: el cambio se guarda solo; al recargar la selección queda como quedó.
3. Si ese cliente además ve proyectos de **otro** grupo, **esperado**: esos accesos no se tocan.

### E2 — Un miembro común no administra clientes (US1, FR-009)

1. Como **miembro** del grupo que **no** es su administrador, abrir la página del grupo y un proyecto que pueda operar.
2. **Esperado**: no ve la sección **Clientes del grupo** ni la pestaña **Acceso cliente**, aunque sí pueda crear y completar tareas.
3. Pedir a mano `GET /api/groups/<id>/clients` y `GET /api/works/<id>/client-grants` → **403** en las dos.

### E2b — Aislamiento entre grupos (FR-009b)

1. Como **ADMIN del grupo A**, pedir a mano `PUT /api/groups/<A>/clients/<clienteId>` con el identificador de un proyecto del **grupo B** en `workIds`.
2. **Esperado**: **400**, "Alguno de los proyectos no pertenece a este grupo". La verificación es del servidor, no solo de qué casillas se muestran.
3. **Esperado**: en la sección Clientes del grupo A no figura ningún cliente que solo tenga accesos en B.

### E2c — Atajo desde el proyecto

1. Como administrador del ámbito, abrir un proyecto → pestaña **Acceso cliente**.
2. **Esperado**: se puede agregar un cliente por correo (queda con acceso a ese proyecto) y hay un enlace a **Clientes del grupo** para asignar varios.

### E3 — Ingreso del cliente (US2)

1. Cerrar sesión y entrar como **cliente**.
2. **Esperado**: se llega directamente a `/portal`, con el distintivo permanente "Vista de cliente · solo lectura". Se ve el proyecto de E2 con su porcentaje de avance y su contador de tareas. No hay barra lateral ni acceso a nada más.
3. En `/admin/clients` (como admin) el estado ahora es **Activo**.

### E4 — La aplicación interna está cerrada (US2, FR-014)

Como **cliente**, escribir a mano en la barra de direcciones:

| Dirección | Esperado |
|---|---|
| `/` | rebota a `/portal` |
| `/board` | rebota a `/portal` |
| `/works/<id>` (el proyecto otorgado) | rebota a `/portal` |
| `/admin` | rebota a `/portal` |
| `/tv` | rebota a `/portal` |
| `/api/works` | 403 con `{"error":{"code":"FORBIDDEN",…}}` |
| `/api/stream` | 403 |

### E5 — Detalle del proyecto (US3)

1. Como **cliente**, abrir el proyecto desde el portal.
2. **Esperado**: se ven **todas** las tareas con su estado nombrado, su fecha de entrega y sus etiquetas; los chips de `#sector` y `@usuario` se muestran, pero **no son enlaces**.
3. **Esperado**: no hay casilla de completado, ni selector de estado, ni menú de tres puntos, ni edición al hacer clic en el texto, ni arrastre para reordenar.
4. Pestañas: **Tareas**, **Documentos**, **Actividad**. **No** hay pestaña Archivos.
5. En **Documentos**: el contenido se ve, no hay barra de herramientas, y escribir o pegar no cambia nada.
6. Pedir `/api/works/<id>/files` a mano → **403**.

### E6 — Proyecto no otorgado (US3, FR-022)

1. Como **cliente**, abrir `/portal/works/<id-de-otro-proyecto>`.
2. **Esperado**: error de no encontrado (**404**), no de prohibido. No se revela que el proyecto exista.

### E7 — Actividad (US4)

1. Como **miembro**, cambiar el estado de dos tareas del proyecto.
2. Como **cliente**, pestaña **Actividad**.
3. **Esperado**: los dos cambios, del más reciente al más antiguo, con el estado de origen, el de destino y la fecha. Sin nombres de quién los hizo.

### E8 — Actualización en vivo (FR-023)

1. Dejar abierto el detalle del proyecto como **cliente** en una ventana.
2. En otra ventana (otro navegador o modo incógnito), como **miembro**, completar una tarea de ese proyecto.
3. **Esperado**: la ventana del cliente refleja el nuevo estado sin recargar.

### E9 — Revocación inmediata (FR-013)

1. Con el cliente en `/portal`, quitarle el proyecto desde la pestaña **Acceso cliente**.
2. Recargar el portal del cliente.
3. **Esperado**: el proyecto desaparece de la lista y `/portal/works/<id>` responde 404. **Sin necesidad de cerrar sesión.**

### E10 — Archivado (FR-015)

1. Volver a darle acceso, después archivar el proyecto como **miembro**.
2. **Esperado**: el proyecto desaparece del portal del cliente. Al desarchivarlo vuelve a aparecer: el otorgamiento se conservó.

### E11 — Aislamiento de identidades (FR-006)

Como **miembro**:

1. Escribir `@cliente` en una tarea → **esperado**: el autocompletado no lo ofrece y la etiqueta no resuelve.
2. En un grupo, buscar "cliente" para agregar un miembro → **esperado**: no aparece.
3. `/admin/users` → **esperado**: la cuenta de cliente no está en la lista (vive en `/admin/clients`).

### E12 — Correo ya usado (FR-010)

1. Como **admin**, intentar dar de alta como cliente el correo `miembro@test.local`.
2. **Esperado**: se rechaza con "Ese correo ya pertenece a un usuario interno del sistema" y la cuenta interna queda intacta.

### E13 — Sin carpeta en la nube (FR-007)

1. Con almacenamiento configurado, dar de alta un cliente.
2. **Esperado**: no se encola ningún trabajo de aprovisionamiento; en `/admin/storage` no aparece un trabajo de creación de usuario para ese correo.

### E14 — Baja (FR-008)

1. Como **admin**, dar de baja al cliente desde `/admin/clients`.
2. **Esperado**: desaparece del listado y de la pestaña Acceso cliente del proyecto. El proyecto y sus tareas quedan intactos.
