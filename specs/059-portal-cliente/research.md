# Research — 059 Portal de cliente

## Decision 1: rol `CLIENT` nuevo en lugar de reusar `READER`

**Decision**: agregar `CLIENT` a `GlobalRole`.

**Rationale**: `access()` concede `read` a un READER sobre el ámbito Global y sobre cualquier grupo con `publicRead: true`. Un cliente montado sobre READER vería sectores, etiquetas y estados globales de toda la organización, y su alcance sería por grupo en vez de por proyecto. Además READER ya significa "cuenta de pantalla" en el producto (redirección a `/tv`, `ReaderGrant`), así que compartir el rol acopla dos features que van a evolucionar por separado.

**Alternatives considered**: reusar READER + un `ClientWorkGrant` que restrinja — descartado porque las ramas de `publicRead` y de ámbito Global seguirían otorgando lectura por su cuenta; habría que agregar excepciones en varias reglas en vez de un solo corte.

## Decision 2: deny-by-default en tres capas, no allowlist ruta por ruta

**Decision**: (1) el borde bloquea todo lo que no sea del portal, (2) los guards deniegan por allowlist positiva de roles, (3) el motor devuelve `none` para CLIENT en todo camino por ámbito.

**Rationale**: una allowlist explícita de las ~90 rutas es un impuesto permanente: toda ruta futura nace alcanzable por el cliente y nadie se acuerda de agregarla. Con deny-by-default, una ruta nueva nace cerrada. La única lista explícita es la del middleware, de cinco entradas, revisable de un vistazo.

**Alternatives considered**: marcar ruta por ruta con un flag — descartado por lo anterior.

## Decision 3: `access()` corta para CLIENT en la primera línea

**Decision**: `if (user.globalRole === "CLIENT") return "none";` antes incluso del corte de SUPERADMIN.

**Rationale**: `access()` es la base de `accessSector`, `canToggle`, `canAddress` y `taskAccess`. Un corte en la raíz neutraliza las cuatro por composición y deja denegadas las ~40 rutas que ya la llaman, sin tocarlas. Es un cambio que no altera el comportamiento de ningún rol existente, así que los tests de permisos actuales pasan sin editarse.

**Alternatives considered**: agregar la condición en cada rama — más superficie de error y más difícil de auditar.

## Decision 4: dos huecos preexistentes que la feature obliga a cerrar

Encontrados durante el diseño; hoy no explotan solo porque el layout redirige a READER a `/tv` (defensa de interfaz, no de servidor).

1. **`canCreateSector` con ámbito personal** — `src/lib/domain/permissions/index.ts:157` devuelve `scope.ownerId === user.id`. Un cliente tiene `id`, así que crear un sector personal le daría `true`, y el gate HTTP (`requireWriter`) hoy solo bloquea READER. Se cierra con el early return de `isWriterRole`. Lo mismo aplica a `POST /api/works` sin `groupId`, donde el chequeo de ámbito solo corre `if (groupId)`.
2. **MCP self-service** — `POST /api/me/mcp-connections` usa `requireSession()`, y `/api/mcp` está exento del middleware. Un cliente podría emitir un token propio y operar por esa vía. Se cierra en `requireMcpConnection` (rechazo por rol) y con `requireInternal` en la ruta de emisión.

**Decision**: cerrar los dos como parte de esta feature, con tests negativos dedicados. Aplican también a READER, así que el cierre es una mejora neta.

## Decision 5: namespace `/api/portal/*` propio, no reusar `/api/works/[id]`

**Decision**: proyección dedicada en `src/server/portal.ts`.

**Rationale**: la respuesta interna incluye `nextcloudFolderPath`, `folderSeq`, `code`, `attachments`, `archive`, `group` y `access`. Un modo dual obligaría a auditar campo por campo una respuesta compartida — exactamente lo que regresiona en silencio cuando una feature futura agrega un campo al `include`. Una proyección propia es una allowlist de forma, testeable con asserts de ausencia de claves.

**Alternatives considered**: parámetro `?view=portal` sobre la ruta interna — descartado por lo anterior.

## Decision 6: SSE con endpoint propio y filtro por otorgamientos

**Decision**: denegar `/api/stream` a CLIENT y crear `GET /api/portal/stream`, que arma el conjunto de proyectos otorgados al conectar y descarta todo evento cuyo `workId` no esté en él. La conexión se cierra a los 15 minutos para forzar reconexión y re-autorización.

**Rationale**: los eventos llevan solo identificadores, pero el broadcast global le revelaría a un cliente la existencia y la tasa de actividad de todos los proyectos de la organización. Un endpoint aparte deja el hub interno intacto: cero riesgo de regresión para el tráfico actual.

**Deuda preexistente, fuera de alcance**: `/api/stream` hoy hace broadcast global a todo usuario autenticado, incluidos READER y miembros sin acceso a esos grupos. Merece spec propia; esta feature no la arregla, solo evita agregarle un consumidor más.

## Decision 7: `globalRole` cacheado en el JWT

**Decision**: dos frentes. (a) refrescar `globalRole` desde la base si pasaron más de 60 segundos desde la última sincronización, marcado con `roleSyncedAt` en el token; (b) prohibir convertir un usuario interno en cliente (el alta responde conflicto si el email ya pertenece a un interno).

**Rationale**: el callback `jwt` solo consulta la base cuando `user` está presente, es decir en el primer login, y el token dura 30 días. Con (b), la única transición posible es cliente → interno, que solo **gana** acceso con demora (inocuo). Con (a), esa demora es de un minuto. Los otorgamientos nunca se cachean, así que la revocación de un proyecto es inmediata en cualquier caso.

## Decision 8: componentes nuevos para el portal en lugar de reusar con `readOnly`

**Decision**: `PortalTaskItem`, `PortalProjectCard`, `PortalStatusBar` y `PortalActivityFeed` nuevos; se reusan `ProgressBar`, `ProjectTabs` y `DocEditor` (con `editable={false}`), y todas las funciones puras y clases CSS existentes.

**Rationale**: `TaskItem` gatea cinco afordancias de escritura con un solo booleano, y ese camino ya corre en producción para proyectos archivados, así que reusar sería técnicamente correcto hoy. Lo que decide es el costo: el cliente no necesita el editor inline, ni el selector de estado, ni el menú, ni el reordenamiento por arrastre, ni los enlaces de los chips. Cerca del 80% de esas 495 líneas es peso muerto en el portal, y auditarlas en cada revisión futura cuesta más que escribir 90 líneas nuevas. El componente nuevo **no tiene props de escritura que alguien pueda invertir por error**.

**Nota de riesgo acotado**: si un refactor futuro agregara una afordancia al componente interno, el portal no la heredaría; y aunque la heredara, el servidor la rechazaría. El modo de falla es de interfaz, no de datos.

## Decision 9: "Actividad" = historial de cambios de estado

**Decision**: endpoint nuevo sobre `TaskStatusChange`.

**Rationale**: `WorkActivityFeed` muestra **solo actividad MCP** (`McpActivityLog`), es decir nombres de herramientas de asistentes de IA. Para un cliente eso es ruido incomprensible y además expone detalle de operación interna. El historial de estados es lo que responde "cómo va el proyecto".

## Decision 10: quién da de alta y qué proyectos se listan

**Decision**: administrar el acceso de clientes está restringido a quien **administra el ámbito** del proyecto — ADMIN del grupo dueño, dueño del espacio personal, o super-admin. Desde ahí también se da de alta un cliente nuevo, que nace atado a ese proyecto. El super-admin conserva además un alta global sin proyecto y la baja. El portal lista solo proyectos activos y no plantilla.

**Rationale**: dar de alta un cliente es acuñar una credencial de ingreso para un correo arbitrario salteándose la lista de correos habilitados, así que no puede quedar en manos de cualquier miembro. Pero exigir al super-admin para cada cliente convierte una tarea de grupo en un cuello de botella. La salida es acotar el alcance por construcción: si el alta ocurre **desde un proyecto**, y para operar esa pantalla hay que administrar el ámbito de ese proyecto, entonces un ADMIN del grupo A solo puede crear clientes con acceso a proyectos del grupo A. No hace falta un chequeo aparte de "¿este proyecto es de tu grupo?": es la misma condición.

Se eligió `canManageClientAccess` (ADMIN del grupo) y no `access === "operate"` (miembro del grupo) porque son decisiones de naturaleza distinta: operar un proyecto es trabajo cotidiano; dejar entrar a alguien de afuera de la organización es administración. Es el mismo criterio que ya rige la administración de etiquetas del ámbito (`requireLabelAdmin`).

**Dónde vive la pantalla**: en el grupo, no en el proyecto. El administrador piensa "quiero sumar a este cliente y que vea estos proyectos", no "quiero encontrar a este cliente en un directorio". Por eso la sección **Clientes del grupo** (`/groups/[id]`) agrega por correo y muestra una casilla por proyecto del grupo, y el `PUT` sincroniza la selección completa: tildar y destildar es la única operación que hay que entender. La pestaña del proyecto queda como atajo — agregar un cliente a *ese* proyecto — y enlaza a la del grupo para lo demás.

**Se descartó el buscador de clientes**, que era el diseño inicial. Además de ser un paso de más, obligaba a decidir qué clientes puede ver cada administrador: un buscador global convierte la pantalla en un directorio de la cartera de toda la organización, y el grupo A enumera los del B tecleando letras. Sin buscador el problema desaparece por construcción — no queda ninguna superficie que liste clientes fuera del propio ámbito.

**El aislamiento se verifica en el servidor**, no solo en las casillas que se muestran: tanto el alta como la edición cuentan cuántos de los `workIds` recibidos pertenecen realmente al grupo y rechazan si falta alguno. Y el borrado se acota con `work: { groupId }`, así que quitarle proyectos a un cliente en el grupo A nunca toca sus accesos en el grupo B.

Ocultar los proyectos archivados evita una segunda sección y un filtro para algo que el producto puede decidir solo (Principio II).
