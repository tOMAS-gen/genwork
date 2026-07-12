# Quickstart: validar el rediseño de Sectores con Tailwind

## Prerrequisitos

- Dependencias instaladas: `npm install` (trae `tailwindcss`, `postcss`, `autoprefijer` nuevos).
- App corriendo en dev: `npm run dev` (puerto 3010).

## Escenario 1 — Lista de sectores (US1, US2, US3)

1. Ir a `/sectors` en tema claro.
2. **Esperado**: cada tarjeta se distingue por un borde de 1px (no por sombra), muestra un rótulo pequeño de
   ámbito arriba del nombre, un badge de ámbito con punto de color (el acento de la app para Global, el color
   propio del sector para Grupo/Personal), y una barra de progreso fina con números en fuente monoespaciada.
3. Cambiar el tema a oscuro con el toggle existente de la app.
4. **Esperado**: la lista se ve correcta en oscuro, con los mismos colores que ya usa el resto de la app en
   oscuro — sin parpadeos ni elementos que se queden en claro.
5. Cambiar el toggle de vista a "lista/tabla".
6. **Esperado**: cada fila sigue mostrando el badge de ámbito (antes solo aparecía en la grilla).
7. Ubicar un sector sin tareas asignadas.
8. **Esperado**: su tarjeta muestra una nota tipo "Sin tareas todavía" en vez de un espacio vacío sin
   explicación.

## Escenario 2 — Diálogo de creación de sector (FR-011 excepción)

1. Si tenés permiso (SUPERADMIN o ADMIN de algún grupo), abrir "Nuevo sector" desde `/sectors`.
2. **Esperado**: el diálogo (marco y contenido) se ve con el nuevo lenguaje visual.
3. Abrir cualquier OTRO diálogo de la app que no sea de Sectores (por ejemplo, crear un grupo desde
   `/groups`).
4. **Esperado**: el MARCO del diálogo también cambió de apariencia (efecto colateral aceptado de restylear
   `Dialog.tsx`), pero el CONTENIDO de ese diálogo (campos, textos, comportamiento) es exactamente el mismo
   que antes — nada de Sectores se filtró ahí.

## Escenario 3 — Detalle de sector (US4)

1. Entrar al detalle de un sector con tareas propias, tareas de trabajos, y referencias.
2. **Esperado**: mismo lenguaje visual que la lista; todas las funciones siguen andando igual que antes:
   - Editar el color del sector (si tenés permiso).
   - Abrir el menú de acciones → "Estados de tarea" y "Eliminar sector".
   - Alternar entre vista lista/tablero de tareas.
   - Crear una tarea nueva.
   - Ver la sección "Referencias" con tareas de otros sectores.
3. Repetir con un usuario sin permiso de operar ese sector.
4. **Esperado**: sigue en modo solo lectura, igual que antes de esta feature.

## Verificación de que nada más cambió (SC-002)

1. Visitar al menos 3 pantallas fuera de Sectores (por ejemplo `/works`, `/groups`, `/admin/task-statuses`).
2. **Esperado**: se ven exactamente igual que antes de esta feature — mismo layout, mismos colores, mismas
   clases visuales. La única diferencia permitida en toda la app fuera de Sectores es el marco de cualquier
   diálogo que usen (por `Dialog.tsx`), nunca su contenido ni comportamiento.

## Checks automáticos de referencia

- `npm run lint` — sin errores nuevos en los archivos tocados.
- `npm run build` — compila sin errores (confirma que Tailwind + PostCSS están bien integrados al build de Next.js).
- `npm test` — todas las suites existentes siguen pasando (esta feature no debería tocar ninguna lógica cubierta por tests).
