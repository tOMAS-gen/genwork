# Quickstart: Nextcloud Storage Integration

**Feature**: 028-nextcloud-storage | **Date**: 2026-07-06

## Prerequisites

1. Docker y Docker Compose instalados
2. genwork corriendo en dev (`npm run dev` en puerto 3010)
3. PostgreSQL corriendo con las migraciones aplicadas

## Setup: Levantar Nextcloud

```bash
# Levantar instancia Nextcloud
docker compose -f deploy/docker-compose.dev.yml up -d

# Verificar que responde (esperar ~30s la primera vez)
curl -s http://localhost:8080/status.php | jq .installed
# → true
```

## Configurar conexión

Agregar a `.env.local`:

```env
NEXTCLOUD_URL=http://localhost:8080
NEXTCLOUD_ADMIN_USER=admin
NEXTCLOUD_ADMIN_PASSWORD=admin
```

## Validación end-to-end

### Escenario 1: Crear proyecto → carpeta creada

1. Abrir genwork (`http://localhost:3010`)
2. Crear un proyecto en un grupo (ej. "Proyecto Test")
3. Verificar en Nextcloud que la carpeta existe:

```bash
curl -u admin:admin http://localhost:8080/remote.php/dav/files/admin/genwork/ \
  -X PROPFIND -H "Depth: 2" | grep "001-Proyecto Test"
```

4. La carpeta debe seguir el formato `NNN-Nombre` (ej. `001-Proyecto Test`)

### Escenario 2: Tab Archivos muestra contenido

1. Subir un archivo a la carpeta del proyecto desde Nextcloud:

```bash
curl -u admin:admin \
  -T /path/to/test.pdf \
  http://localhost:8080/remote.php/dav/files/admin/genwork/MiGrupo/001-Proyecto%20Test/test.pdf
```

2. Abrir el proyecto en genwork, ir a pestaña "Archivos"
3. Verificar que `test.pdf` aparece en la lista con nombre, tamaño y fecha
4. Click en el archivo → debe abrir Nextcloud web

### Escenario 3: Archivar mueve la carpeta

1. Archivar el proyecto desde el menú de genwork
2. Verificar que la carpeta se movió:

```bash
# Ya no está en activos
curl -u admin:admin http://localhost:8080/remote.php/dav/files/admin/genwork/MiGrupo/ \
  -X PROPFIND -H "Depth: 1" | grep "001-Proyecto Test"
# → no results

# Está en archivados
curl -u admin:admin http://localhost:8080/remote.php/dav/files/admin/genwork/MiGrupo/_archivados/ \
  -X PROPFIND -H "Depth: 1" | grep "001-Proyecto Test"
# → found
```

### Escenario 4: Nextcloud caído no rompe genwork

1. Parar Nextcloud: `docker compose -f deploy/docker-compose.dev.yml stop`
2. Crear un proyecto en genwork → debe crearse sin error
3. Abrir pestaña Archivos → debe mostrar mensaje "Nextcloud no disponible"
4. Levantar Nextcloud de nuevo → la carpeta se crea automáticamente (job encolado)

### Escenario 5: Permisos de grupo

1. Loguear como usuario del grupo → puede ver archivos del proyecto
2. Loguear como usuario de otro grupo → no puede ver archivos
3. Loguear como usuario sin grupo → solo ve sus proyectos personales

## Checklist de validación

- [ ] Nextcloud levanta con docker compose
- [ ] Carpeta se crea al crear proyecto (formato `NNN-Nombre`)
- [ ] Tab Archivos lista archivos reales de Nextcloud
- [ ] Click en archivo abre Nextcloud web
- [ ] Archivar mueve carpeta a `_archivados/`
- [ ] Desarchivar mueve carpeta de vuelta
- [ ] Renombrar proyecto renombra carpeta (conserva NNN)
- [ ] Nextcloud caído no bloquea operaciones de genwork
- [ ] Permisos: usuario solo ve archivos de sus grupos/proyectos
