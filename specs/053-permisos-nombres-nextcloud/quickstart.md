# Quickstart: Permisos y nombres de carpeta en Nextcloud

Prerrequisitos: instancia Nextcloud corriendo (Docker, ver `specs/028-nextcloud-storage`), servidor genwork con `npm run dev`, un usuario `SUPERADMIN` para ver el panel Admin > Storage.

## 1. Permisos de grupo sincronizan de verdad (US1)

1. Crear un grupo nuevo `Taller Prueba` (o reusar uno).
2. Agregar un usuario B como miembro (`POST /api/groups/:id/members`, o desde la UI).
3. Esperar a que el job `ADD_MEMBER` corra (ticker de 30s) y verificar en la instancia Nextcloud (interfaz web o `occ group:list`) que B aparece en el grupo Nextcloud correspondiente.
4. Con la sesión de B, abrir la pestaña Archivos de un proyecto de ese grupo y confirmar que puede listar y subir un archivo.
5. Quitar a B del grupo y repetir el paso 4: debe perder el acceso.
6. **Caso de carrera**: crear un grupo nuevo y, en los primeros segundos (antes de que `CREATE_GROUP_FOLDER` corra), agregar un miembro. Verificar que el `ADD_MEMBER` no se marca `FAILED` prematuramente — sigue `PENDING` hasta que la carpeta del grupo existe, y luego se completa.

**Esperado**: en todos los casos, B tiene o no tiene acceso real en Nextcloud según su membresía actual, sin intervención manual.

## 2. Nombre en minúsculas y migración de carpetas (US2)

1. Crear un proyecto nuevo `Mueble Living` dentro de un grupo `Farmacia Central`.
2. Verificar en Nextcloud que la carpeta vive dentro de `/genwork/Farmacia Central/` y se llama `023-mueble living` (secuencia + nombre en minúsculas, SIN repetir "Farmacia Central" en el nombre de la carpeta).
3. Renombrar el proyecto a `Mueble Living V2` desde genwork y verificar que la carpeta Nextcloud se renombra a `023-mueble living v2` (misma secuencia).
4. Sobre un proyecto creado ANTES de esta feature con carpeta en mayúsculas/mixta: tras el deploy, verificar que su carpeta quedó renombrada automáticamente a minúsculas, con los mismos archivos adentro.

## 3. Auditoría diaria de permisos (US3)

1. Como `SUPERADMIN`, entrar directamente a Nextcloud y quitar manualmente a un usuario de un grupo Nextcloud que en genwork sigue figurando como miembro (desincroniza a propósito).
2. Disparar manualmente el ciclo de auditoría (en dev: llamar la función del ticker directamente, o reducir el intervalo para la prueba) en vez de esperar 24hs.
3. Abrir `Admin > Storage` en genwork y verificar que aparece un job `AUDIT_GROUP_PERMISSIONS` en estado `FAILED` con la diferencia descrita en `lastError`.
4. Confirmar que el botón "Reintentar" existente sigue funcionando sobre este job (vuelve a auditar).

## Comandos útiles

```bash
npm run test          # vitest run — cubre paths.ts, projectCode.ts, queue.ts
npm run lint
```
