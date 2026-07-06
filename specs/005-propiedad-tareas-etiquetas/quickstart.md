# Quickstart: validación de propiedad de edición, progreso y etiquetas (005)

**Fecha**: 2026-07-03 | **Plan**: [plan.md](plan.md)

## Setup

```bash
docker compose -f deploy/docker-compose.dev.yml up -d
npx prisma migrate deploy          # migración 0003 (origen/adopción + etiquetas)
npm run dev                        # http://localhost:3010
npm test                           # incluye ownership.test.ts y progress.test.ts
```

Entrar como "Admin de prueba". Tener el proyecto Tina y el sector Ploteo (crearlos si no están).

## US1 — Propiedad de edición

1. En Tina crear `Plotear acrílico #Ploteo` (origen: proyecto).
2. Ir al sector Ploteo: la tarea se ve con su casilla, pero tocar el texto NO edita.
3. En Ploteo crear `Cortar vinilo /Tina` (origen: sector).
4. Editarla desde Ploteo: el texto editable NO muestra `/Tina` (chip fijo aparte); corregir y
   guardar → sigue en Tina.
5. Editar esa misma tarea desde la página de Tina (adopción) → volver a Ploteo: ya no se puede
   editar el texto (solo marcar).
6. API directa (garantía server): PATCH desde contexto sector con `/OtroProyecto` en el texto →
   409 WORK_LOCKED.

## US2 — Captura unificada en sectores

1. En Ploteo: bloc de notas al pie (sin botón "Agregar"); escribir 3 tareas con Enter seguido.
2. Pegar 2 líneas → 2 tareas. Autocompletado `/ # @` igual que en proyecto.

## US3 — Edición estética Notion

1. Tocar el texto de una tarea editable: la casilla sigue visible, el texto queda editable en el
   mismo lugar, sin recuadro ni salto de altura; resalte sutil.
2. Guardar/cancelar: la fila no salta.

## US4 — Progreso

1. Tina con 4 tareas, 1 realizada → página muestra barra "1/4 · 25%"; el listado de proyectos
   muestra la mini barra en la tarjeta.
2. Marcar otra tarea → 50% en vivo (sin recargar) en ambas vistas.
3. Proyecto sin tareas → sin barra.

## US5 — Etiquetas

1. En la página de Tina, abrir el selector de etiquetas → "Gestionar etiquetas…" (sos admin del
   ámbito): crear clave "Prioridad" con valores Alta=rojo, Baja=gris.
2. Asignar "Alta" a Tina → chip rojo en la página y en la tarjeta del listado.
3. Asignar "Baja" (misma clave) → reemplaza al chip rojo.
4. Crear clave "Tipo" (Gráfica=azul) y asignarla → conviven chips de claves distintas.
5. Intentar borrar el valor "Baja" en uso → advertencia con conteo; confirmar → Tina queda sin
   esa etiqueta.
6. Con el usuario "Miembro de prueba" (sin admin del ámbito personal del admin): en un proyecto
   de grupo donde opere, puede asignar valores existentes pero no ve "Gestionar etiquetas…".
7. Tema oscuro: los chips se leen bien.

## Regresión

- `npm test` completo verde.
- Crear/editar tareas desde el proyecto funciona igual (incluida la reasignación `/otro`).
- Marcar desde sector EXEC sigue funcionando en todas las tareas (adoptadas o no).
