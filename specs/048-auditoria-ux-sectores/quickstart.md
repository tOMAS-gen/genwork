# Quickstart: Validar la auditoría UI/UX

## Prerrequisitos

- `npm install` ya corrido.
- Servidor dev levantado: `npm run dev` (puerto configurado en el repo, ver `package.json`).
- Sesión logueada con un usuario que tenga al menos un sector propio (Personal) con tareas.

## Validación por componente

Para cada punto, comparar contra los criterios de FR-001 a FR-011 en [spec.md](./spec.md#requirements-mandatory).

1. **Drawer (`DrawerNav`)**: colapsar a modo mini (rail) y navegar solo con Tab/Enter — cada ícono debe anunciar su destino (tooltip/aria-label). Expandir "Sectores" con más de 10 ítems y confirmar que "+N más…" es alcanzable por teclado.
2. **`/sectors` (lista)**: reducir el viewport a 375px, cambiar a vista "lista" (tabla) — no debe aparecer scroll horizontal de página; la tabla scrollea en su propio contenedor si hace falta. Navegar las filas con teclado.
3. **`/sectors/[id]` (detalle)**: en un sector sin tareas, verificar que el estado vacío sea consistente con el de `/sectors`. Abrir el `ColorField` y el menú de acciones ("Estados de tarea" / "Eliminar sector") solo con teclado.
4. **`LabelPicker`**: abrir el picker de etiquetas de un proyecto, agregar y quitar una etiqueta secundaria, y una principal. Confirmar que el popover de selección cierra con Escape devolviendo el foco al botón "Agregar etiqueta".
5. **`TaskStatusSettings`**: en un sector con permiso de escritura, crear/editar/eliminar un estado — la eliminación debe pedir confirmación (`showConfirm`) con estilo de peligro.
6. **`TaskInlineEdit` / `TaskListEditor` / `TagSuggestionsMenu`**: escribir una tarea usando los 4 símbolos (`/ # @ $`); provocar una etiqueta sin resolver (nombre inexistente) y confirmar que el mensaje de error/"crear o corregir" aparece junto al input, no como alerta genérica.
7. **`Dialog`**: abrir cualquier diálogo (p. ej. `LabelPicker`), confirmar foco atrapado dentro, Escape cierra, y el foco vuelve al botón que lo abrió.
8. **Reduced motion**: activar "reducir movimiento" en el SO/navegador y repetir 1–7 — las transiciones (hover de `SectorCard`, apertura de `Dialog`, expansión del drawer) deben reducirse o desaparecer.

## Resultado esperado

Todos los puntos anteriores cumplen sin ajuste manual adicional; cualquier desvío es un hallazgo a corregir por las tareas de implementación (`tasks.md`).
