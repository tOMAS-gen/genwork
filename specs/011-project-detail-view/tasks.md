# Tasks: Vista de detalle de proyecto (rediseño con tabs)

**Plan**: [plan.md](plan.md)
**Created**: 2026-07-03

## Fase A — Infraestructura

- [x] T001 [P1] [US1] [sonnet] Agregar estilos CSS en `src/app/globals.css` para: `.project-tabs` (flex row, border-bottom, botones con línea activa), `.status-bar` (flex row horizontal con separadores), `.inline-desc` (textarea toggle con placeholder), `.file-explorer` (lista de archivos con íconos).
- [x] T002 [P1] [US1] [sonnet] Crear `src/components/works/ProjectTabs.tsx`: componente de tabs genérico. Props: `items: { key: string; label: string; icon: ComponentType }[]`, `activeKey: string`, `onChange: (key: string) => void`. Renderiza botones con ícono + label, línea inferior en el activo.
- [x] T003 [P1] [US2] [sonnet] Crear `src/components/works/InlineDescription.tsx`: descripción editable inline. Props: `workId: string`, `initialValue: string | null`, `editable: boolean`. Click muestra textarea, blur guarda via `PATCH /api/works/{id}` con `{ description }`, Escape cancela. Placeholder "Agregar descripción...".
- [x] T004 [P1] [US3] [sonnet] Crear `src/components/works/StatusBar.tsx`: barra de estado horizontal. Props: `work: WorkFull`. Muestra: contador tareas (done/total), ProgressBar existente, fecha de entrega con ícono Calendar + `getDueDateUrgency` con color, pill de estado read-only ("Activo"/"Archivado") con clase `.status-pill`.

## Fase B — API de archivos

- [x] T005 [P2] [US4] [sonnet] Crear `src/app/api/works/[id]/files/route.ts`: GET handler. Recibe `?path=` (subpath relativo, default ""). Lee `work.nextcloudFolderPath` de la BD. Llama `getStorageProvider().list(fullPath)`. Si no hay folderPath, retorna 404. Si storage falla, retorna 500. Devuelve `StorageFileInfo[]`.
- [x] T006 [P2] [US4] [sonnet] Crear `src/app/api/works/[id]/files/download/route.ts`: GET handler. Recibe `?path=file.pdf`. Lee `work.nextcloudFolderPath`, construye fullPath. Llama `getStorageProvider().read(fullPath)`. Retorna stream con `Content-Disposition: attachment; filename="..."`.

## Fase C — Componente FileExplorer

- [x] T007 [P2] [US4] [sonnet] Crear `src/components/works/FileExplorer.tsx`: explorador de archivos. Props: `workId: string`. Fetch a `/api/works/{id}/files?path=currentPath`. Estado local `currentPath`. Lista con íconos (Folder/File de lucide-react). Click en carpeta navega (actualiza currentPath), click en archivo abre download. Breadcrumb de ruta. Empty state si no hay archivos o no hay carpeta configurada. Loading con Skeleton.

## Fase D — Integración

- [x] T008 [P1] [US1,US2,US3] [sonnet] Refactorizar `src/app/(main)/works/[id]/page.tsx`: 1) Header: agregar dot color con `getProjectColor` + `InlineDescription`. 2) Reemplazar ProgressBar por `StatusBar`. 3) Tabs: usar `ProjectTabs` con estado local. Renderizar contenido por tab: tasks (TaskListEditor+TaskItems), docs (DocEditor), files (FileExplorer). Mantener LabelPicker y ProjectMenu en su lugar. Sin regresión funcional.

## Fase E — Verificación

- [x] T009 [P1] [sonnet] Verificar: `tsc --noEmit` pasa, preview visual en ambos temas, tabs funcionales, descripción editable, dot de color correcto, vista grid/lista del dashboard sin regresión.
