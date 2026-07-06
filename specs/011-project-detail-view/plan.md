# Plan técnico: Vista de detalle de proyecto (rediseño con tabs)

**Spec**: [spec.md](spec.md)
**Created**: 2026-07-03

## Contexto técnico

### Stack
- Next.js 15 (App Router), React 19, TypeScript 5.8
- CSS puro con variables (design tokens en `globals.css`)
- Tiptap/ProseMirror para editor de documentos
- Prisma ORM, SQLite
- Storage abstraction: `StorageProvider` con `list(folderPath)` → `StorageFileInfo[]`

### Archivos existentes a modificar
- `src/app/(main)/works/[id]/page.tsx` — página principal del detalle. Se refactoriza para usar tabs.
- `src/app/globals.css` — estilos nuevos para tabs, status bar mejorada, inline edit.

### Archivos nuevos
- `src/components/works/ProjectTabs.tsx` — componente de tabs (Tareas/Documentos/Archivos)
- `src/components/works/StatusBar.tsx` — barra de estado con urgencia y selector
- `src/components/works/InlineDescription.tsx` — descripción editable inline
- `src/components/works/FileExplorer.tsx` — explorador de archivos del proyecto
- `src/app/api/works/[id]/files/route.ts` — API endpoint para listar archivos de la carpeta

### Utilidades existentes (reutilizar)
- `getProjectColor(labels)` → color del primer tag
- `getDueDateUrgency(dueDate)` → `{ label, color }` 
- `progress(done, total)` → `{ pct, label }`
- `getProjectStatus(done, total)` → status string
- `StorageProvider.list(folderPath)` → `StorageFileInfo[]`
- `StorageProvider.read(filePath)` → `Readable` (para descargas)
- Clases `.label-chip`, `.label-{color}`, `.project-dot`, `.due-{color}`, `.status-pill`

## Decisiones de diseño

### D1: Tabs — estado local con useState, sin URL params
Las tabs son client-side. Mantener `useState<'tasks' | 'docs' | 'files'>('tasks')`. No usar URL params (simplifica el código, el contenido de cada tab se monta/desmonta pero no pierde datos porque el estado vive en el parent).

El tab activo se indica con una línea inferior (`border-bottom`) y color de acento. Los tabs inactivos muestran texto muted.

### D2: Componente de tabs reutilizable
`ProjectTabs` es un componente genérico: recibe items `{ key, label, icon }` y el key activo. Renderiza botones con íconos y la línea inferior. El contenido se renderiza fuera del componente de tabs (en page.tsx).

### D3: Descripción editable inline — contentEditable o textarea toggle
Usar un `<p>` que al click se reemplaza por `<textarea>` (mismo espacio visual). Blur guarda via `PATCH /api/works/{id}` con `{ description }`. Escape cancela. Placeholder "Agregar descripción..." cuando vacío.

No usar `contentEditable` — es inconsistente cross-browser y no vale la pena para un solo párrafo.

### D4: Status bar — componente separado
`StatusBar` recibe work data y muestra:
- Contador "done/total tareas"  
- ProgressBar existente (reutilizar)
- Separador `·`
- Fecha de entrega + urgencia (reutilizar `getDueDateUrgency`)
- Selector de estado (select nativo o Menu component)

El "selector de estado" solo tiene ACTIVE/ARCHIVED — eso es lo que tiene el modelo Prisma. No se inventan estados UI.

### D5: Dot de color — span.project-dot con label-{color}
Reutiliza las clases CSS `.project-dot.label-{color}` ya existentes. Se agrega antes del `<h1>` del nombre.

### D6: File explorer — API route + componente client
**API**: `GET /api/works/{id}/files?path=subfolder` → llama `getStorageProvider().list()` con el `nextcloudFolderPath` del work + subpath relativo. Devuelve `StorageFileInfo[]`.

**Descargas**: `GET /api/works/{id}/files/download?path=file.pdf` → llama `getStorageProvider().read()` y devuelve el stream con `Content-Disposition: attachment`.

**Componente**: `FileExplorer` recibe `workId`. Hace fetch a la API. Muestra lista con íconos (folder/file), click en folder navega, click en file descarga. Breadcrumb de navegación interna de carpetas.

### D7: Sin regresión
TaskListEditor, TaskItem, DocEditor, LabelPicker, ProjectMenu — se reutilizan tal cual. Solo se mueven dentro de sus tabs respectivas.

## Flujo de implementación

### Fase A: Infraestructura (CSS + componentes base)
1. CSS: estilos `.project-tabs`, `.status-bar`, `.inline-desc`, `.file-explorer`
2. `ProjectTabs` componente
3. `InlineDescription` componente
4. `StatusBar` componente

### Fase B: API de archivos
5. API route `GET /api/works/{id}/files` (list)
6. API route `GET /api/works/{id}/files/download` (stream)

### Fase C: Componente FileExplorer
7. `FileExplorer` componente con navegación de carpetas

### Fase D: Integración en page.tsx
8. Refactorizar page.tsx: header mejorado + tabs + contenido por tab

### Fase E: Verificación
9. tsc, preview visual, ambos temas

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Nextcloud no configurado en dev | FileExplorer muestra empty state graceful; API devuelve 404 con mensaje |
| `list()` lento para carpetas grandes | Loading state con Skeleton; NFR dice <2s para 100 items |
| Tab switch pierde estado de DocEditor | DocEditor tiene autosave con debounce; re-montar re-fetch el doc |
| Archivado vs estados UI | Solo ACTIVE/ARCHIVED; no se inventan estados; labels son la forma de indicar "En producción" |
