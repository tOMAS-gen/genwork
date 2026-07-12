# Feature Specification: Sistema de Actualización Automática

**Feature Branch**: `043-actualizacion-automatica`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "sistema de actualización automática"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver si hay una actualización disponible (Priority: P1)

Un administrador (SUPERADMIN) entra al panel de administración de su instancia de genwork y quiere saber, sin conectarse por SSH al servidor, si existe una versión más nueva publicada de la aplicación (spec 029: la imagen se publica en GitHub Container Registry en cada push a `main`) respecto a la que está corriendo actualmente.

**Why this priority**: Es la base de todo lo demás — sin poder ver que hay una actualización disponible, no hay nada que aplicar ni que registrar.

**Independent Test**: Publicar una imagen nueva (tag/digest distinto al que corre la instancia), esperar el próximo chequeo, y verificar que el panel de administración muestra "Actualización disponible" con la versión detectada.

**Acceptance Scenarios**:

1. **Given** la instancia corre la última versión publicada, **When** el administrador abre el panel de administración, **Then** ve que está actualizado, sin advertencias.
2. **Given** se publicó una versión más nueva desde el último chequeo, **When** el administrador abre el panel, **Then** ve un aviso de "Actualización disponible" con la versión nueva.
3. **Given** el sistema no puede contactar al registro de imágenes (sin internet, GHCR caído), **When** intenta chequear, **Then** lo indica como "No se pudo verificar" en vez de fallar silenciosamente o mostrar un falso "actualizado".

---

### User Story 2 - Aplicar la actualización (Priority: P1)

Un administrador quiere que la instancia pase a correr la versión nueva detectada, sin tener que editar el `docker-compose` ni ejecutar comandos manualmente por SSH.

**Why this priority**: Es el valor central de la feature — detectar una actualización sin poder aplicarla no ahorra el trabajo manual que hoy existe.

**Independent Test**: Con una actualización disponible detectada, disparar la aplicación de la actualización y verificar que la instancia queda corriendo la versión nueva (visible en el panel de administración) sin intervención manual por SSH.

**Acceptance Scenarios**:

1. **Given** hay una actualización disponible, **When** el administrador la confirma explícitamente desde el panel de administración, **Then** el sistema reinicia el servicio con la versión nueva y la instancia queda corriendo esa versión.
2. **Given** una actualización se está aplicando, **When** el proceso falla (ej. la imagen nueva no arranca), **Then** el sistema lo señala claramente como error, sin quedar en un estado ambiguo sobre qué versión está corriendo.
3. **Given** la actualización se aplicó con éxito, **When** el administrador vuelve a abrir el panel, **Then** ve la nueva versión como la actual y dejar de mostrarse el aviso de actualización disponible.

---

### User Story 3 - Consultar el historial de actualizaciones (Priority: P2)

Un administrador quiere saber qué versiones se aplicaron a su instancia y cuándo, para tener trazabilidad ante un problema ("¿esto empezó a fallar después de actualizar?").

**Why this priority**: Aporta valor de auditoría y diagnóstico, pero no es necesario para que las User Stories 1 y 2 (detectar y aplicar) ya sean útiles por sí solas.

**Independent Test**: Aplicar dos actualizaciones seguidas y verificar que el historial lista ambas, en orden, con fecha y resultado (éxito/error) de cada una.

**Acceptance Scenarios**:

1. **Given** se aplicaron actualizaciones anteriormente, **When** el administrador consulta el historial, **Then** ve cada actualización con versión anterior, versión nueva, fecha/hora y resultado.

---

### Edge Cases

- ¿Qué pasa si el chequeo de versión nueva encuentra la misma versión que ya está corriendo? No debe mostrar ningún aviso de actualización disponible.
- ¿Qué pasa si una actualización falla a mitad de camino? El sistema debe señalarlo como error visible para el administrador (US2, escenario 2), sin dejar la aplicación caída sin ningún aviso.
- ¿Qué pasa si dos administradores intentan aplicar la misma actualización al mismo tiempo? Solo debe aplicarse una vez; el segundo intento debe indicar que ya está en curso o ya se aplicó.
- ¿Qué pasa con los servicios de terceros que corren junto a genwork (Postgres, Nextcloud)? Quedan fuera de esta actualización — el sistema solo actualiza la imagen de la aplicación genwork en sí.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE verificar periódicamente si existe una versión más nueva de la imagen de la aplicación publicada, respecto a la que está corriendo la instancia actual.
- **FR-002**: El sistema DEBE mostrar a los administradores, en el panel de administración, si hay una actualización disponible y qué versión es.
- **FR-003**: El sistema DEBE requerir confirmación explícita de un administrador antes de aplicar una actualización y reiniciar el servicio — nunca debe reiniciarse automáticamente sin esa confirmación.
- **FR-004**: El sistema DEBE registrar cada actualización aplicada (versión anterior, versión nueva, cuándo, resultado: éxito o error).
- **FR-005**: El sistema DEBE señalar de forma visible si una actualización falla, sin dejar la aplicación en un estado silenciosamente roto.
- **FR-006**: El sistema DEBE permitir a un administrador consultar el historial de actualizaciones aplicadas.
- **FR-007**: Solo usuarios con rol de administrador global (SUPERADMIN) pueden ver el estado de actualización y gestionarla.
- **FR-008**: El sistema DEBE evitar que dos actualizaciones se apliquen en simultáneo sobre la misma instancia.
- **FR-009**: Si el sistema no puede verificar la versión disponible (sin conexión al registro de imágenes), DEBE indicarlo explícitamente en vez de asumir que está actualizado o fallar sin explicación.

### Key Entities

- **Estado de actualización**: versión actualmente corriendo, última versión disponible detectada, fecha/hora del último chequeo, y si el último chequeo tuvo éxito o falló.
- **Registro de actualización (historial)**: una entrada por cada actualización aplicada — versión anterior, versión nueva, quién la disparó (administrador o "automático"), cuándo, resultado (éxito/error) y detalle si falló.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede saber si su instancia está actualizada sin conectarse por SSH al servidor.
- **SC-002**: El sistema detecta una versión nueva publicada dentro de la hora siguiente a su publicación.
- **SC-003**: El 100% de las actualizaciones aplicadas (exitosas o fallidas) queda registrado para consulta posterior.
- **SC-004**: Ante una actualización fallida, el administrador se entera en menos de 5 minutos desde que ocurrió el fallo, sin necesidad de revisar logs del servidor manualmente.

## Assumptions

- Esta feature actualiza únicamente la imagen de la aplicación genwork publicada vía CI (spec 029, GHCR); no cubre actualizar servicios de terceros que corren junto a ella (Postgres, Nextcloud), que el operador sigue gestionando por su cuenta.
- El chequeo de nueva versión es periódico (polling contra el registro de imágenes), no una notificación en tiempo real por webhook — no se requiere infraestructura adicional para recibir eventos externos.
- Aplicar una actualización implica reiniciar el contenedor de la aplicación con la imagen nueva; las migraciones de base de datos siguen corriendo como ya lo hacen hoy al iniciar el contenedor (`prisma migrate deploy` en el entrypoint), sin pasos manuales adicionales para esta feature.
- No se incluye rollback automático a la versión anterior si la nueva falla en esta v1; el registro de historial (US3) deja constancia de qué versión funcionaba antes, para que el administrador decida revertir manualmente si hace falta.
- No se notifica por email/mensajería externa cuando hay una actualización disponible o cuando falla una aplicada; alcanza con que sea visible en el panel de administración al ingresar (podría integrarse a futuro con la feature de recordatorios, spec 036, fuera de alcance de esta v1).
- Aplicar la actualización (US2) es un proceso en segundo plano con estado consultable (mismo patrón ya usado en el proyecto para operaciones que tardan y pueden fallar, ej. `ArchiveRecord` con estados BUILDING/READY/FAILED), no una espera bloqueante en la misma pantalla — de ahí que SC-004 hable de "se entera en menos de 5 minutos" y no de una respuesta inmediata.
