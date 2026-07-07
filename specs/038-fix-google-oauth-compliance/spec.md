# Feature Specification: Corregir compliance OAuth 2.0 de Google para conectar Drive

**Feature Branch**: `038-fix-google-oauth-compliance`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Error 400: invalid_request al conectar Google Drive — 'this app doesn't comply with Google's OAuth 2.0 policy for keeping apps secure'. El login con Google funciona, pero el flujo OAuth de Drive (scope sensible) falla."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El administrador conecta Google Drive sin error OAuth (Priority: P1)

Un administrador que ya tiene configuradas las credenciales de Google Cloud Console (Client ID y Secret) y quiere conectar Google Drive desde el panel de almacenamiento. Al hacer clic en "Conectar Google Drive", se abre la pantalla de consentimiento de Google, el admin autoriza, y vuelve a la plataforma con Drive conectado. Hoy este flujo falla con Error 400: invalid_request.

**Why this priority**: Sin esto, la feature de Google Drive (spec 034) es inutilizable. Bloquea toda la integración Drive.

**Independent Test**: Con credenciales de Google Cloud Console configuradas correctamente, hacer clic en "Conectar Google Drive" y completar el flujo OAuth sin error.

**Acceptance Scenarios**:

1. **Given** un admin con credenciales OAuth correctamente configuradas en Google Cloud Console (consent screen completado, redirect URI registrada, app en modo testing con el admin como test user o en modo internal), **When** hace clic en "Conectar Google Drive", **Then** se abre la pantalla de consentimiento de Google, autoriza, y vuelve a `/admin/storage?gdrive=connected`.
2. **Given** credenciales OAuth incompletas o consent screen no configurado, **When** el admin intenta conectar, **Then** ve un mensaje de error claro que indica qué falta configurar, no un error críptico de Google.
3. **Given** la app en modo testing y el admin NO es test user, **When** intenta conectar, **Then** el error de Google se captura y se muestra con guía de qué hacer (agregar el email como test user en Google Cloud Console).

---

### User Story 2 - Guía de configuración para el admin (Priority: P1)

Un administrador que instala genwork por primera vez necesita saber cómo configurar Google Cloud Console correctamente para que el flujo OAuth de Drive funcione. La plataforma incluye instrucciones claras o las muestra en el panel de almacenamiento cuando falta configuración.

**Why this priority**: La causa raíz del error es configuración faltante en Google Cloud Console. Sin guía, el admin no puede resolverlo solo.

**Independent Test**: Siguiendo las instrucciones documentadas, un admin puede configurar Google Cloud Console desde cero y conectar Drive exitosamente.

**Acceptance Scenarios**:

1. **Given** un admin sin configuración previa de Google Cloud Console, **When** accede al panel de almacenamiento y elige Google Drive, **Then** ve instrucciones o un enlace a la guía de configuración.
2. **Given** la guía de configuración, **When** un admin la sigue paso a paso, **Then** logra: crear el OAuth consent screen, crear el OAuth client, agregar la redirect URI correcta, agregar su email como test user, y configurar las variables de entorno. Tiempo estimado: <10 minutos.

---

### User Story 3 - Mensajes de error accionables en lugar de error críptico (Priority: P2)

Cuando el flujo OAuth de Google falla (Error 400, scopes rechazados, redirect URI inválida, etc.), la plataforma muestra un mensaje que explica la causa probable y sugiere acciones, en lugar de mostrar el error críptico de Google o redirigir silenciosamente.

**Why this priority**: Mejora la experiencia post-fix: incluso con la guía, pueden quedar errores de configuración. Mensajes accionables reducen soporte.

**Independent Test**: Provocar distintos errores OAuth (redirect URI mal, consent screen incompleto, etc.) y verificar que cada uno muestra un mensaje útil.

**Acceptance Scenarios**:

1. **Given** un error 400 invalid_request de Google, **When** el callback captura el error, **Then** el panel muestra "La configuración de OAuth no es válida: verificá que el OAuth consent screen esté completado y que la redirect URI coincida."
2. **Given** un error access_denied (el admin cancela el consentimiento), **When** vuelve al callback, **Then** el panel muestra "Se canceló la autorización. Podés reintentar."
3. **Given** un error de scope (scope no habilitado en el consent screen), **When** se captura, **Then** el panel muestra "El scope de Drive no está habilitado. Agregá el scope en Google Cloud Console."

---

### Edge Cases

- **Redirect URI no coincide**: el admin configuró la redirect URI en Google Cloud Console con una URL diferente a la que usa la app (http vs https, dominio distinto). El error se intercepta y se muestra la redirect URI que la app espera.
- **Client ID/Secret vacíos**: la app no inicia el flujo OAuth y muestra "Configurá GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las variables de entorno".
- **Consent screen en modo External sin verificación**: la app funciona solo para test users agregados manualmente. La guía documenta esto y explica cómo agregar test users.
- **Consent screen en modo Internal (Google Workspace)**: funciona para todos los usuarios del dominio sin verificación. La guía lo cubre como la opción recomendada para organizaciones con Workspace.

## Requirements *(mandatory)*

### Functional Requirements

**Diagnóstico y resolución del error OAuth (US1)**

- **FR-001**: El flujo OAuth de Drive DEBE funcionar cuando la configuración de Google Cloud Console es correcta (consent screen configurado, redirect URI registrada, test users agregados o app en modo internal).
- **FR-002**: La redirect URI que la app envía a Google (`{origin}/api/admin/storage/google/callback`) DEBE coincidir exactamente con la registrada en Google Cloud Console. La app DEBE mostrar la URI esperada en el panel de almacenamiento para que el admin la copie.
- **FR-003**: El sistema DEBE validar que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (o `GDRIVE_CLIENT_ID`/`GDRIVE_CLIENT_SECRET`) no estén vacíos ANTES de iniciar el flujo OAuth, y mostrar un mensaje claro si faltan.

**Guía de configuración (US2)**

- **FR-004**: El panel de almacenamiento DEBE mostrar la redirect URI que el admin necesita registrar en Google Cloud Console, para evitar errores de URI mismatch.
- **FR-005**: La plataforma DEBE incluir instrucciones de configuración accesibles desde el panel de almacenamiento que cubran: crear proyecto en Google Cloud Console, configurar OAuth consent screen, crear OAuth Client ID, agregar redirect URI, agregar scopes de Drive, y agregar test users.

**Mensajes de error accionables (US3)**

- **FR-006**: Cuando el callback de OAuth recibe un error de Google (vía query params `error` y `error_description`), el sistema DEBE mapear los errores comunes a mensajes en español con sugerencias de acción.
- **FR-007**: Los errores mapeados DEBEN cubrir al menos: `invalid_request` (consent screen/config), `access_denied` (cancelación), `invalid_scope` (scope no habilitado), y redirect URI mismatch.
- **FR-008**: Si el error no está mapeado, el sistema DEBE mostrar el error original de Google junto con una sugerencia genérica de verificar la configuración.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador con credenciales correctas de Google Cloud Console puede completar el flujo OAuth de Drive y conectar exitosamente en el primer intento.
- **SC-002**: Un administrador que configura Google Cloud Console por primera vez, siguiendo la guía, logra conectar Drive en menos de 10 minutos.
- **SC-003**: El 100% de los errores OAuth comunes (invalid_request, access_denied, invalid_scope) muestran mensajes en español con sugerencia de acción, en lugar del error críptico de Google.
- **SC-004**: La redirect URI correcta se muestra en el panel de almacenamiento, eliminando los errores de URI mismatch.

## Assumptions

- El login con Google (NextAuth) ya funciona correctamente; el problema es exclusivo del flujo OAuth de Drive que pide el scope sensible `https://www.googleapis.com/auth/drive`.
- El error ocurre porque la app de Google Cloud Console no tiene el OAuth consent screen configurado completamente, o la app está en modo "External testing" sin el admin como test user, o le falta la redirect URI del flujo de Drive.
- La solución NO requiere verificación formal de Google (proceso de semanas). Para apps internas/pequeñas, alcanza con modo "Internal" (Workspace) o modo "Testing" con test users explícitos.
- Se reutilizan las mismas credenciales `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` para login y Drive (el código ya soporta `GDRIVE_CLIENT_ID` separado como fallback).
- No se cambia la arquitectura del flujo OAuth existente (authorize → consent → callback → save refresh token). Solo se mejoran validaciones, mensajes de error y documentación.
