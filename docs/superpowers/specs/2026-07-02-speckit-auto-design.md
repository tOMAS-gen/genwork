# Diseño: skill `speckit-auto` — pipeline speckit autoencadenado con modelos escalonados

**Fecha:** 2026-07-02
**Estado:** aprobado en diseño, pendiente de plan de implementación

## Problema

El flujo spec-kit actual requiere disparar cada paso a mano (`/speckit.specify` → `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`) y todo corre con el modelo principal (caro). Mucho tiempo muerto entre pasos y tokens caros gastados en tareas simples.

## Objetivo

Un solo comando: el usuario describe la implementación y el pipeline corre completo de forma automática. Única pausa obligatoria: las preguntas de clarify. El modelo principal (potente) se usa solo para pensar/estructurar; la implementación se despacha a modelos menores según complejidad de cada tarea.

## Decisiones tomadas

- **Forma:** skill de Claude Code (`~/.claude/skills/speckit-auto/SKILL.md`), invocada como `/speckit-auto <descripción>`. Todo dentro del mismo chat, sin herramientas externas.
- **Reusa speckit existente:** invoca las skills `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-analyze` en secuencia. Mismos artefactos (`specs/NNN-*/spec.md`, `plan.md`, `tasks.md`). No se reimplementa nada del pipeline.
- **Checkpoints:** solo clarify pausa y espera al usuario. Si no hay ambigüedades, no pausa. Todo lo demás corre de corrido.
- **Asignación de modelos:** al generar `tasks.md`, cada tarea se etiqueta con el modelo adecuado:
  - `[haiku]` — tareas mecánicas: renombres, configs, boilerplate, imports.
  - `[sonnet]` — código normal, componentes, endpoints, tests. Default.
  - `[opus]` — lógica compleja: migraciones de datos, auth, concurrencia, refactors estructurales.

## Arquitectura

```
Usuario: /speckit-auto "descripción"
   │
   ▼  (sesión madre = modelo activo, potente)
1. speckit-specify   → spec.md
2. speckit-clarify   → ⏸ PAUSA si hay preguntas; sin ambigüedades → salta
3. speckit-plan      → plan.md, research.md, data-model.md
4. speckit-tasks     → tasks.md con etiqueta [haiku|sonnet|opus] por tarea
5. speckit-analyze   → consistencia; inconsistencias menores se autocorrigen
6. Implement         → por cada tarea en orden de dependencias:
                        Agent(model: <etiqueta>, prompt: spec+plan+tarea)
                        tareas [P] independientes → subagentes en paralelo
7. Verificación      → npm run lint && npm run test && npm run build
                        falla → subagente sonnet corrige, reintenta (máx 2)
                        sigue fallando → reporta al usuario y para
8. Reporte final     → qué se hizo, tareas por modelo, archivos, tests
```

## Componentes

- **SKILL.md** (`~/.claude/skills/speckit-auto/`): instrucciones del pipeline para la sesión madre. Define secuencia, regla de etiquetado de modelos, formato de despacho a subagentes, política de reintentos y de pausas.
- **Etiquetado en tasks.md:** se agrega a la línea de cada tarea el sufijo de modelo (ej. `- [ ] T003 [P] [sonnet] Crear endpoint ...`). Formato compatible con speckit: es texto extra en la descripción, no rompe parsers existentes.
- **Despacho de subagentes:** cada tarea va a un `Agent` con modelo etiquetado y contexto mínimo: ruta de spec.md y plan.md, texto de la tarea, convenciones del repo. El subagente lee lo que necesita, implementa, corre lint/tests de su ámbito, devuelve resumen corto.
- **Registro global:** entrada en `~/.claude/CLAUDE.md` para el trigger `/speckit-auto`.

## Flujo de errores e imprevistos

- Subagente falla o encuentra decisión de diseño imprevista → la madre pregunta al usuario con AskUserQuestion, aplica la respuesta y continúa. No aborta el resto de tareas.
- Verificación final falla tras 2 reintentos → reporte con log del error, sin commit.
- Sin commits automáticos: el usuario committea.

## Fuera de alcance (YAGNI)

- Cambiar el modelo de la sesión madre en caliente (no es posible desde una skill; el escalonamiento se logra vía subagentes).
- Integración con GitHub issues (`speckit-taskstoissues` sigue disponible aparte).
- Paralelismo masivo tipo Workflow: el despacho es secuencial con paralelismo solo en tareas `[P]`.

## Criterio de éxito

- Un comando lleva de descripción a implementación completa con una sola interacción (clarify).
- tasks.md etiquetado; tareas simples ejecutadas por haiku/sonnet.
- Artefactos idénticos en formato al flujo speckit manual: el usuario puede volver al flujo manual en cualquier momento.
