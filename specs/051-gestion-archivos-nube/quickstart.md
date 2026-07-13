# Quickstart: Gestión completa de archivos en la nube

## Prerrequisitos

- Entorno con Nextcloud levantado (spec 028, `docker compose up` del stack local) o Google Drive configurado como proveedor activo (spec 034), con al menos 2 usuarios de prueba en genwork con acceso a proyectos distintos (para validar User Story 4).
- Variables de entorno de Nextcloud/Google ya presentes (ver `.env` del proyecto, sin cambios de esta feature).
- `npx prisma migrate dev` aplicado (agrega `StorageIdentity`, `FileShare`).

## Escenario 1 — Vincular cuenta y crear carpeta (US1 + US4)

1. Iniciar sesión en genwork con un usuario que **no** vinculó su cuenta de almacenamiento todavía.
2. Ir a un proyecto → pestaña Archivos. Debe verse un aviso "Vinculá tu cuenta para gestionar archivos" con link a Ajustes.
3. En Ajustes → "Mi cuenta en la nube", vincular (Login Flow v2 de Nextcloud, o consentimiento de Drive).
4. Volver a la pestaña Archivos → crear una carpeta "Prueba". Verificar que aparece en el listado y en la interfaz nativa del proveedor (Nextcloud web o Drive).

**Éxito esperado**: la carpeta existe y, si se audita el log de la operación, queda atribuida al usuario (no a la cuenta admin) — ver Escenario 3.

## Escenario 2 — Subir, descargar y eliminar (US1 + US2)

1. Dentro de "Prueba", subir un archivo (ya soportado desde 034).
2. Pulsar "Descargar" y verificar que el archivo descargado coincide byte a byte con el subido.
3. Pulsar "Eliminar" sobre la carpeta "Prueba" (con contenido) → confirmar en el modal → verificar que carpeta y archivo desaparecen tanto en genwork como en el proveedor.

**Éxito esperado**: ciclo completo (crear → subir → descargar → eliminar) en menos de 30s (SC-001).

## Escenario 3 — Aislamiento por membresía real (US4)

1. Con Usuario A (sección "Metalúrgica") y Usuario B (sección "Compras", sin acceso a proyectos de Metalúrgica), Usuario B intenta acceder por URL directa a la pestaña Archivos de un proyecto de Metalúrgica.
2. Verificar 403 antes de cualquier llamada al proveedor (SC-002).
3. Auditar (log de aplicación o, en Nextcloud, el log de actividad del servidor) las operaciones de archivos hechas por Usuario A durante el Escenario 1 y 2 → deben figurar bajo la identidad de Usuario A, no bajo la cuenta admin (SC-004).

## Escenario 4 — Compartir (US3)

1. Sobre un archivo del proyecto, elegir "Compartir" → modo "Link público", generar el link.
2. Abrir el link en una ventana privada/incógnito (sin sesión de genwork ni del proveedor) → debe poder verse/descargarse el archivo.
3. Elegir "Compartir" → modo "Alta interna", seleccionar a Usuario B (que no tenía acceso al proyecto) → verificar que Usuario B ahora puede ver ese archivo puntual (pero no el resto del proyecto).
4. Revocar ambos accesos → verificar que el link ya no funciona y que Usuario B pierde el acceso puntual.

**Éxito esperado**: SC-003 — el elemento es accesible solo mientras el share está vigente y solo por el destinatario indicado.

## Notas de troubleshooting

- Si `STORAGE_IDENTITY_MISSING` aparece después de vincular la cuenta: revisar que `StorageIdentity.revokedAt` sea `null` y que el `provider` coincida con `AccessConfig.storageProvider` activo.
- Si el Login Flow v2 nunca completa: los tokens de `poll` de Nextcloud expiran; reintentar `start`.
