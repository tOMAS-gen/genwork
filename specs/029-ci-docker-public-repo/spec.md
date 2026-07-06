# Feature Specification: CI Docker & Repo Público

**Feature Branch**: `029-ci-docker-public-repo`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "hacelo publico el repositorio y crea una imagen en actions docker para dar parametrs como la url, lo de id de google y la impletacion opsional de nexcloud"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imagen Docker parametrizable vía CI (Priority: P1)

Un operador quiere desplegar genwork en su servidor. Pushea a la rama principal y GitHub Actions construye automáticamente una imagen Docker publicada en GitHub Container Registry (GHCR). La imagen acepta variables de entorno para configurar la URL pública de la aplicación, las credenciales de Google OAuth y, opcionalmente, la conexión a Nextcloud.

**Why this priority**: Sin imagen automatizada no hay despliegue reproducible. Es el bloque fundacional de todo lo demás.

**Independent Test**: Hacer push a `main`, verificar que el workflow construye y publica la imagen en GHCR, y que un `docker run` con las variables requeridas arranca la aplicación correctamente.

**Acceptance Scenarios**:

1. **Given** un push a `main`, **When** el workflow de GitHub Actions se ejecuta, **Then** una imagen Docker etiquetada con el SHA del commit y `latest` se publica en GHCR.
2. **Given** la imagen publicada, **When** un operador ejecuta `docker run` pasando `AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` y `DATABASE_URL`, **Then** la aplicación arranca, corre migraciones y responde en la URL configurada.
3. **Given** la imagen publicada, **When** un operador NO define las variables de Nextcloud (`NEXTCLOUD_URL`, `NEXTCLOUD_ADMIN_USER`, `NEXTCLOUD_ADMIN_PASSWORD`), **Then** la aplicación arranca normalmente sin funcionalidad de almacenamiento en la nube (las features de archivos quedan deshabilitadas).
4. **Given** la imagen publicada, **When** un operador SÍ define las variables de Nextcloud, **Then** la integración de carpetas y archivos funciona según lo implementado en la feature 028.

---

### User Story 2 - Repositorio público en GitHub (Priority: P2)

El dueño del proyecto quiere hacer público el repositorio para compartir el código y permitir que otros lo usen o contribuyan.

**Why this priority**: Es una acción administrativa puntual. No bloquea el CI, pero complementa la publicación de la imagen.

**Independent Test**: Verificar que el repositorio es accesible sin autenticación desde un navegador.

**Acceptance Scenarios**:

1. **Given** el repositorio actual en GitHub (privado), **When** se cambia la visibilidad a público, **Then** cualquier usuario puede clonar y ver el código.
2. **Given** el repositorio público, **When** un usuario externo accede, **Then** NO encuentra secretos, claves ni credenciales hardcodeadas en el historial ni en el código actual.

---

### User Story 3 - Documentación de despliegue (Priority: P3)

Un operador nuevo quiere saber cómo desplegar genwork. El README o la documentación de deploy explican qué variables de entorno configurar, cuáles son obligatorias y cuáles opcionales, y cómo arrancar el sistema.

**Why this priority**: Documentación es necesaria pero no bloquea la funcionalidad técnica.

**Independent Test**: Un operador sin contexto previo puede desplegar siguiendo solo la documentación.

**Acceptance Scenarios**:

1. **Given** la documentación de deploy, **When** un operador la lee, **Then** encuentra la lista completa de variables de entorno con descripción, valores por defecto y cuáles son obligatorias.
2. **Given** la documentación, **When** un operador sigue los pasos, **Then** puede levantar genwork con `docker compose` en menos de 10 minutos.

---

### Edge Cases

- ¿Qué pasa si el build falla por dependencias? El workflow debe reportar el error claramente en el log de Actions y no publicar imagen rota.
- ¿Qué pasa si se pushea un tag de versión (ej. `v1.1.0`)? La imagen debería etiquetarse también con ese tag semántico.
- ¿Qué pasa si faltan variables obligatorias al arrancar el contenedor? La aplicación debe fallar rápido con un mensaje claro indicando qué variable falta.
- ¿Qué pasa si el repositorio tiene secretos en el historial de git? Se deben auditar y rotar antes de hacer público.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE tener un workflow de GitHub Actions que construya la imagen Docker en cada push a `main`.
- **FR-002**: El workflow DEBE publicar la imagen en GitHub Container Registry (GHCR) con tags `latest` y el SHA corto del commit.
- **FR-003**: El workflow DEBE etiquetar la imagen con el tag semántico cuando se pushea un tag git que empiece con `v`.
- **FR-004**: La imagen DEBE aceptar las siguientes variables de entorno obligatorias: `DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_URL`.
- **FR-005**: La imagen DEBE aceptar variables de entorno opcionales para Nextcloud: `NEXTCLOUD_URL`, `NEXTCLOUD_ADMIN_USER`, `NEXTCLOUD_ADMIN_PASSWORD`, `APP_ENCRYPTION_KEY`.
- **FR-006**: La aplicación DEBE funcionar correctamente sin las variables de Nextcloud, deshabilitando la funcionalidad de almacenamiento en la nube.
- **FR-007**: La aplicación DEBE validar al arrancar que las variables obligatorias están presentes y fallar con mensaje claro si alguna falta.
- **FR-008**: El repositorio DEBE ser público en GitHub.
- **FR-009**: El repositorio NO DEBE contener secretos, claves ni credenciales en el código ni en el historial de git.
- **FR-010**: La documentación DEBE listar todas las variables de entorno con descripción, obligatoriedad y valores por defecto.

### Key Entities

- **Workflow CI**: Definición del pipeline de construcción y publicación de la imagen Docker.
- **Imagen Docker**: Artefacto inmutable publicado en GHCR, parametrizable por variables de entorno.
- **Variables de entorno**: Configuración externa que determina el comportamiento de la aplicación en tiempo de ejecución.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un push a `main` produce una imagen Docker publicada en GHCR en menos de 10 minutos.
- **SC-002**: Un operador puede desplegar genwork funcional siguiendo la documentación en menos de 10 minutos.
- **SC-003**: La aplicación arranca correctamente con las variables obligatorias y sin las opcionales de Nextcloud.
- **SC-004**: El 100% de las variables obligatorias faltantes producen un mensaje de error específico al arrancar.
- **SC-005**: Cero secretos o credenciales expuestas en el repositorio público.

## Assumptions

- El registro de contenedores es GHCR (incluido con GitHub, sin costo adicional para repos públicos).
- El Dockerfile de producción ya existe en `deploy/Dockerfile` y funciona (validado en v1.0.0).
- La autenticación de Google OAuth ya está implementada en el código; solo falta parametrizar las credenciales.
- La integración con Nextcloud ya está implementada (feature 028); solo se necesita hacerla condicional según la presencia de variables de entorno.
- No se requiere CI para ramas que no sean `main` ni para pull requests en esta iteración.
- El operador tiene Docker y Docker Compose instalados en su servidor.
