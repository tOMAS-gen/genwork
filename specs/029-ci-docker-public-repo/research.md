# Research: CI Docker & Repo Público

## R1: GitHub Actions para GHCR

**Decision**: Usar workflow con `docker/build-push-action` + `docker/login-action` para GHCR.

**Rationale**: Patrón estándar de GitHub. GHCR es gratuito para repos públicos, no requiere cuentas externas. El `GITHUB_TOKEN` integrado tiene permisos para publicar paquetes.

**Alternatives considered**:
- Docker Hub: requiere cuenta separada + secreto adicional → descartado por simplicidad.
- Self-hosted registry: complejidad innecesaria → descartado.

## R2: Etiquetado de imágenes

**Decision**: Tags `latest` + SHA corto en push a main. Tag semántico adicional en push de tag `v*`.

**Rationale**: `latest` para despliegues simples, SHA para trazabilidad, semántico para versiones estables.

**Alternatives considered**:
- Solo `latest`: pierde trazabilidad → descartado.
- Branch-based tags: innecesario para repo con un solo branch productivo → descartado.

## R3: Nextcloud condicional

**Decision**: Hacer que `getStorageProvider()` retorne `null` si las variables de Nextcloud no están definidas. El queue ticker solo arranca si el storage está configurado. Los endpoints de archivos/attachments retornan 404 o vacío si no hay storage.

**Rationale**: El código actual lanza `throw Error("Nextcloud sin configurar")` si faltan variables. Esto rompe la app cuando Nextcloud es opcional. Un patrón `StorageProvider | null` es el más simple y no invasivo.

**Alternatives considered**:
- Feature flag explícita (`ENABLE_NEXTCLOUD=true`): agrega una variable más, redundante con la presencia de URL → descartado.
- Mock/no-op provider: complejidad innecesaria, mejor retornar null y que los callers manejen → descartado.

## R4: Auditoría de secretos

**Decision**: Verificar que `.env*` están en `.gitignore`, que no hay credenciales hardcodeadas en el código, y que el historial no tiene archivos `.env` commiteados. Si hay secretos en el historial, rotarlos (no reescribir historial).

**Rationale**: Reescribir historial con `git filter-branch` rompe SHAs y es riesgoso. Mejor rotar las credenciales afectadas.

## R5: Validación de variables al arrancar

**Decision**: Script de validación en `entrypoint.sh` que verifica variables obligatorias antes de correr migraciones.

**Rationale**: Falla rápido con mensaje claro, antes de intentar conectar a la base de datos.
