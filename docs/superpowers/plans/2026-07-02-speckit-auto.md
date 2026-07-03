# speckit-auto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skill global `/speckit-auto` que autoencadena el pipeline speckit completo con única pausa en clarify y despacha la implementación a subagentes con modelo etiquetado por tarea.

**Architecture:** Un solo archivo de instrucciones (`~/.claude/skills/speckit-auto/SKILL.md`) que la sesión madre ejecuta: invoca las skills speckit del proyecto en secuencia vía Skill tool, agrega etiquetas de modelo a tasks.md, y reemplaza la fase implement por despacho de subagentes vía Agent tool con `model` por etiqueta. Más una entrada de registro en `~/.claude/CLAUDE.md`.

**Tech Stack:** Claude Code skills (markdown + YAML frontmatter), Skill tool, Agent tool, spec-kit (skills `speckit-*` del proyecto).

## Global Constraints

- Idioma de la skill y sus mensajes: español.
- La skill NO reimplementa pasos speckit: siempre invoca las skills `speckit-*` existentes del proyecto.
- Única pausa obligatoria del pipeline: preguntas de clarify (y AskUserQuestion ante imprevistos de implementación).
- Etiquetas de modelo válidas: `[haiku]`, `[sonnet]`, `[opus]` — coinciden con los valores del parámetro `model` del Agent tool.
- Formato de tarea en tasks.md se preserva: la etiqueta se inserta después del ID y marcadores existentes, ej. `- [ ] T003 [P] [US1] [sonnet] Crear endpoint...`.
- Sin commits automáticos del código implementado: el usuario committea.
- Los archivos de esta implementación viven en `~/.claude/` (fuera de este repo): no llevan commit; solo este plan y la spec se committean en el repo.

---

### Task 1: Crear `~/.claude/skills/speckit-auto/SKILL.md`

**Files:**
- Create: `~/.claude/skills/speckit-auto/SKILL.md`

**Interfaces:**
- Consumes: skills `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-analyze` (instaladas por proyecto en `.claude/skills/`), Agent tool (`model: haiku|sonnet|opus`), AskUserQuestion.
- Produces: skill invocable `/speckit-auto <descripción>` disponible en toda sesión de Claude Code del usuario.

- [ ] **Step 1: Crear el directorio y escribir el SKILL.md completo**

Contenido exacto del archivo `~/.claude/skills/speckit-auto/SKILL.md`:

````markdown
---
name: speckit-auto
description: "Pipeline speckit autoencadenado: specify→clarify→plan→tasks→analyze→implement de corrido, única pausa en clarify. Etiqueta cada tarea con [haiku|sonnet|opus] y la despacha a un subagente con ese modelo para ahorrar tokens. Usar cuando el usuario invoca /speckit-auto con la descripción de una implementación."
argument-hint: "Descripción de la implementación o cambio deseado"
user-invocable: true
disable-model-invocation: false
---

# speckit-auto — pipeline speckit autoencadenado con modelos escalonados

## Input del usuario

```text
$ARGUMENTS
```

`$ARGUMENTS` es la descripción de la implementación. Si está vacío, pedila con AskUserQuestion antes de empezar.

## Precondiciones (verificar ANTES de todo)

1. Existe `.specify/` en la raíz del proyecto. Si no existe → abortar con: "Proyecto sin spec-kit. Inicializá con: `uvx --from git+https://github.com/github/spec-kit.git specify init <proyecto>`".
2. Las skills `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-analyze` están disponibles (vienen con el proyecto spec-kit). Si falta alguna → abortar y reportar cuál.

## Reglas globales del pipeline

- Correr TODAS las fases de corrido, sin pedir confirmación entre fases.
- ÚNICA pausa planificada: preguntas de clarify (Fase 2). Ante imprevistos durante la implementación, pausar con AskUserQuestion, aplicar la respuesta y continuar.
- La sesión madre (modelo potente) SOLO piensa, estructura y coordina. El código de implementación lo escriben subagentes con modelos menores.
- Nunca commitear código implementado. El usuario committea.
- Al final de cada fase, emitir una línea de estado corta: `✔ Fase N (<nombre>) — <resultado en ≤10 palabras>`.

## Fase 1 — Specify

Invocar Skill `speckit-specify` con args = `$ARGUMENTS`. Resultado: `specs/NNN-*/spec.md` nuevo o actualizado.

## Fase 2 — Clarify (única pausa)

Invocar Skill `speckit-clarify`. Si detecta ambigüedades, hará preguntas al usuario: esperarlas y responder la spec con lo que el usuario decida — esta es la ÚNICA pausa del pipeline. Si no hay ambigüedades, seguir sin pausar.

## Fase 3 — Plan

Invocar Skill `speckit-plan`. Resultado: `plan.md` (+ `research.md`, `data-model.md`, etc. según corresponda).

## Fase 4 — Tasks con etiqueta de modelo

Invocar Skill `speckit-tasks` con args:

```text
Además del formato estándar, etiquetá CADA tarea con exactamente una etiqueta de modelo insertada después del ID y de los marcadores [P]/[USn]: [haiku], [sonnet] u [opus]. Criterio: [haiku] = tareas mecánicas sin decisiones (renombres, configs, imports, boilerplate, textos); [sonnet] = código normal (componentes, endpoints, tests, queries, estilos); [opus] = lógica compleja o riesgosa (migraciones de datos, auth/seguridad, concurrencia, refactors estructurales, algoritmos). Ante la duda: [sonnet]. Ejemplo: `- [ ] T003 [P] [US1] [sonnet] Crear endpoint de filtrado en src/app/api/works/route.ts`.
```

Después de generar `tasks.md`, verificar que TODAS las tareas tienen etiqueta. Si alguna quedó sin etiqueta, editarla directamente aplicando el criterio anterior.

## Fase 5 — Analyze

Invocar Skill `speckit-analyze`. Inconsistencias menores o mecánicas entre spec/plan/tasks: corregirlas directamente en los archivos sin preguntar. Solo pausar con AskUserQuestion si la inconsistencia implica una decisión de producto que cambia el alcance.

## Fase 6 — Implement por subagentes

NO invocar `speckit-implement`. En su lugar:

1. Leer `tasks.md` y armar el orden de ejecución respetando fases y dependencias declaradas en el propio archivo.
2. Para cada tarea pendiente (`- [ ]`), despachar un subagente con el Agent tool:
   - `subagent_type`: `general-purpose`
   - `model`: el de la etiqueta de la tarea (`haiku`, `sonnet` u `opus`)
   - `run_in_background`: false para tareas secuenciales; para un grupo consecutivo de tareas `[P]` independientes entre sí, despacharlas en paralelo (varios Agent en un mismo mensaje) y esperar a todas antes de seguir.
   - `prompt`: incluir exactamente —
     * Ruta absoluta del proyecto y rutas de `spec.md`, `plan.md` y `tasks.md` del feature (leelas si necesitás contexto).
     * El texto completo de la tarea (ID incluido).
     * "Seguí las convenciones del código existente. Implementá SOLO esta tarea, nada más."
     * "Si el proyecto tiene script de lint o tests que cubren tu cambio, corrélos y corregí hasta que pasen."
     * "No commitees. Al terminar devolvé: archivos tocados + resumen de ≤3 líneas + resultado de checks."
3. Cuando el subagente termina OK: marcar la tarea `[X]` en `tasks.md` (lo hace la sesión madre, no el subagente).
4. Si un subagente falla o reporta que necesita una decisión de diseño: pausar con AskUserQuestion, re-despachar la tarea con la decisión incluida en el prompt, y continuar con el resto.
5. Emitir progreso cada pocas tareas: `T00X..T00Y listas (n/total)`.

## Fase 7 — Verificación final

Detectar scripts en `package.json` (u equivalente del stack) y correr en orden: lint → tests → build. 

- Si algo falla: despachar un subagente `sonnet` con el log del error y la instrucción de corregir. Máximo 2 reintentos por comando.
- Si sigue fallando tras 2 reintentos: parar y reportar al usuario el log y el diagnóstico. NO seguir.

## Fase 8 — Reporte final

Emitir resumen corto:

- Feature: `specs/NNN-*/`
- Tareas ejecutadas por modelo: haiku N, sonnet N, opus N (+ estimación de ahorro: qué proporción del trabajo NO usó el modelo caro)
- Archivos creados/modificados (lista)
- Verificación: lint/test/build con resultado
- Pendientes o desvíos (si hubo)
- Recordatorio: "Sin commits — revisá y committeá vos."
````

- [ ] **Step 2: Verificar frontmatter y estructura**

Run: `head -8 ~/.claude/skills/speckit-auto/SKILL.md`
Expected: frontmatter YAML con `name: speckit-auto`, `user-invocable: true`.

Run: `grep -c "Fase" ~/.claude/skills/speckit-auto/SKILL.md`
Expected: ≥ 8 (las 8 fases presentes).

*(Sin commit: archivo fuera del repo.)*

### Task 2: Registrar trigger en `~/.claude/CLAUDE.md`

**Files:**
- Modify: `~/.claude/CLAUDE.md` (agregar sección al final)

**Interfaces:**
- Consumes: skill `speckit-auto` creada en Task 1.
- Produces: instrucción global para que cualquier sesión invoque la skill ante `/speckit-auto`.

- [ ] **Step 1: Agregar bloque al final de `~/.claude/CLAUDE.md`**

Texto exacto a agregar (respetando el formato de las entradas existentes graphify/tasks/flutter-ui):

```markdown

# speckit-auto
- **speckit-auto** (`~/.claude/skills/speckit-auto/SKILL.md`) - pipeline speckit autoencadenado con modelos escalonados. Trigger: `/speckit-auto <descripción>`
When the user types `/speckit-auto` (with any arguments), invoke the Skill tool with `skill: "speckit-auto"` before doing anything else.
```

- [ ] **Step 2: Verificar**

Run: `grep -A2 "^# speckit-auto" ~/.claude/CLAUDE.md`
Expected: el bloque completo presente, una sola vez.

*(Sin commit: archivo fuera del repo.)*

### Task 3: Prueba de humo del pipeline

**Files:**
- Test: ninguno (verificación operacional en sesión nueva).

**Interfaces:**
- Consumes: skill registrada (Tasks 1-2), proyecto genwork con `.specify/` y skills speckit.

- [ ] **Step 1: Verificar disponibilidad en sesión headless**

Run: `cd /Users/tomi/Desktop/en_trabajo/genwork && claude -p "Listá tus skills disponibles que empiecen con 'speckit'. Solo nombres, nada más." --model haiku`
Expected: la lista incluye `speckit-auto` junto a las speckit del proyecto.

- [ ] **Step 2: Prueba real con cambio trivial (manual, usuario)**

En una sesión nueva de Claude Code en genwork, correr:

```text
/speckit-auto agregar un comentario de documentación breve al README describiendo el comando npm run dev
```

Expected: pipeline corre de corrido (specify→…→implement), pausa como mucho en clarify, tasks.md sale etiquetado, subagente haiku/sonnet hace el cambio, reporte final sin commit.

- [ ] **Step 3: Commit del plan en este repo**

```bash
git add docs/superpowers/plans/2026-07-02-speckit-auto.md
git commit -m "Add implementation plan for speckit-auto skill"
```
