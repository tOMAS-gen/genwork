# Quickstart: validación de edición inline y navegación (feature 004)

**Fecha**: 2026-07-03 | **Plan**: [plan.md](plan.md)

## Setup

```bash
docker compose -f deploy/docker-compose.dev.yml up -d
npm run dev      # http://localhost:3010
npm test         # incluye tag-matching.test.ts
```

Entrar como "Admin de prueba". Tener 2 proyectos: uno de una palabra ("Tina") y uno multi-palabra
("Obra Escuela Norte"), y el sector "Metalurgica".

## US1 — Edición inline

1. En un proyecto, tocar el texto de una tarea existente → se vuelve editable en el lugar con el
   texto crudo.
2. Corregir una palabra + Enter → guarda y vuelve a modo lectura.
3. Editar y agregar `#Metalurgica` (usar el autocompletado) → la tarea queda etiquetada.
4. Editar, borrar todo + Enter → NO se guarda vacía (restaura).
5. Escape durante la edición → descarta cambios.
6. En la vista de sector: editar una tarea suelta y agregarle `/Tina` → pasa al proyecto Tina
   manteniendo el vínculo con el sector; aparece el aviso "Tarea enviada a /Tina".
7. Proyecto archivado / apartado Referencias / rol Lector: tocar el texto NO edita.

## US2 — Direccionar a otro proyecto (fix nombres con espacios)

1. En el proyecto Tina, escribir `Pedir presupuesto /Obra` → el autocompletado sugiere
   "Obra Escuela Norte"; elegirlo inserta la forma etiquetable (`/Obra-Escuela-Norte`).
2. Enter → la tarea NO queda en Tina; aviso "Tarea enviada a /Obra Escuela Norte" con enlace;
   abrir el enlace y verla ahí.
3. Escribir a mano `Comprar candado /obra-escuela-norte` → resuelve igual (espacio ≡ guion).
4. Escribir `/Obr` sin autocompletar + Enter → resuelve por prefijo único; si hubiera dos
   proyectos "Obra…", pide corregir (unresolved).
5. `/ProyectoInexistente` → ofrece crear o corregir (flujo actual).

## US3 — Dashboard con drawer

1. Entrar al dashboard como Admin → se ve el drawer normal de la app; NO hay hamburguesa
   flotante sobre el tablero.
2. Tocar el botón de ocultar del drawer → tablero a pantalla completa; queda solo un botoncito
   discreto para reabrir.
3. Reabrir → el drawer vuelve. Navegar a Proyectos → el estado (oculto/visible) se mantiene;
   recargar → persiste.
4. Entrar como Lector → tablero limpio, sin drawer ni controles (igual que antes).

## US4 — Drawer: grupos, ícono, colapso, tema

1. Expandir "Grupos" en el drawer → sublista de grupos; tocar uno navega a su página; "ver
   todos" va al listado.
2. "Administración" tiene ícono (consistente con el resto).
3. Selector de tema al pie del drawer: elegir **Oscuro** → toda la UI oscura (texto legible,
   etiquetas /#@ y estados con contraste); recargar → sigue oscuro.
4. Elegir **Sistema** → sigue el modo del SO; cambiar el modo del SO → la UI cambia sin recargar.
5. Elegir **Claro** → vuelve al tema actual.
6. Sin flash de tema incorrecto al recargar (anti-FOUC).

## Regresión

- `npm test` verde (suite completa + tag-matching nuevo).
- Crear tareas con `#sector` y `@usuario` sigue igual; "perfil 20/20" sigue sin etiquetar.
- El menú slash del documento (feature 003) sigue funcionando.
