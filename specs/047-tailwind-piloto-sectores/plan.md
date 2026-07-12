# Implementation Plan: Rediseño visual de Sectores con Tailwind (piloto de migración)

**Branch**: `047-tailwind-piloto-sectores` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/047-tailwind-piloto-sectores/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Instalar Tailwind CSS (v3, PostCSS) en genwork y usarlo para reescribir por completo la sección Sectores
(lista, tarjeta, diálogo de creación, detalle) con el lenguaje visual ya aprobado (fondo plano, borde de 1px,
badge de ámbito con punto, barra de progreso fina, kicker tipográfico). El `theme` de Tailwind se mapea contra
los tokens de color YA existentes en `globals.css` vía `var(--...)`, de forma que los mismos custom properties
sigan siendo la única fuente de verdad de color — así los componentes de Sectores heredan el cambio de tema
claro/oscuro automáticamente sin declarar variantes `dark:` para color. El mecanismo de dark mode de Tailwind
se configura contra el selector real de la app (`[data-theme="dark"]`, no `prefers-color-scheme` ni clase). El
Preflight (reset global) de Tailwind se desactiva explícitamente para que `@tailwind base` no altere ningún
elemento fuera de los archivos que usan clases de Tailwind — esto es lo que garantiza que el resto de la app
no cambie de apariencia (FR-011/SC-002), salvo la única excepción acordada: `src/components/ui/Dialog.tsx`
(componente compartido) también se reescribe con Tailwind, afectando el marco de todos los diálogos de la app.

## Technical Context

**Language/Version**: TypeScript (Node.js, Next.js 15 App Router)

**Primary Dependencies (nuevas)**: `tailwindcss` (v3), `postcss`, `autoprefixer` — como devDependencies, integradas vía `postcss.config.js` (patrón estándar de Next.js, sin plugin de Next específico necesario)

**Storage**: N/A — esta feature no toca datos ni Prisma.

**Testing**: Vitest ya existente. No se agrega testing de componentes (no hay `@testing-library/react` en el repo — confirmado, y la spec lo excluye explícitamente, Assumptions). Verificación de esta feature es visual/manual (quickstart.md) + los checks automáticos ya existentes (lint/build/test) para confirmar que no hay regresiones de lógica.

**Target Platform**: Web app self-hosted (Next.js App Router, sin cambios de infraestructura).

**Project Type**: web-service (monolito Next.js existente).

**Performance Goals**: Sin metas nuevas. Tailwind vía PostCSS con JIT genera solo las clases usadas — no debería impactar el tamaño de bundle de forma perceptible dado el alcance acotado (unos pocos archivos).

**Constraints**:
- El `theme` de Tailwind DEBE resolver contra los custom properties existentes (`var(--accent)`, `var(--bg)`, etc.), no contra valores hex nuevos — para no duplicar la paleta (FR-008).
- `darkMode` de Tailwind DEBE usar el selector de atributo real de la app, `[data-theme="dark"]` (FR-009) — Tailwind v3.4+ soporta esto vía `darkMode: ["selector", '[data-theme="dark"]']`.
- Preflight de Tailwind DEBE quedar desactivado (`corePlugins: { preflight: false }`) para no resetear estilos de elementos fuera del alcance de esta feature (consecuencia directa de FR-011/SC-002 — sin esto, `@tailwind base` cambiaría márgenes/tipografía por defecto de TODA la app, no solo Sectores).
- `src/components/ui/Dialog.tsx` es la única excepción admitida a "no tocar nada fuera de Sectores" (Clarify 2026-07-12) — su restyling con Tailwind es intencional y afecta a todos los diálogos de la app.

**Scale/Scope**: 5 archivos de producción tocados (`sectors/page.tsx`, `SectorsView.tsx`, `SectorCard.tsx`, `CreateSectorDialog.tsx`, `sectors/[id]/page.tsx`) + 1 archivo compartido (`Dialog.tsx`) + config nueva (`tailwind.config.ts`, `postcss.config.js`) + 3 líneas nuevas en `globals.css` (directivas `@tailwind`). Sin cambios de esquema ni de API.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluación contra los Core Principles I–V (`.specify/memory/constitution.md`):

- **I. Tarea única, múltiples vistas** — ✅ Sin impacto. No toca tareas ni sus vistas, solo el envoltorio visual de Sectores.
- **II. Etiquetado inline como interfaz primaria** — ✅ Sin impacto. No toca el flujo de etiquetado `/`, `#`, `@`, `$`.
- **III. Trabajo = Documentación + Tareas** — ✅ Sin impacto.
- **IV. Completado binario, estados configurables** — ✅ Sin impacto en el invariante; el detalle de sector sigue mostrando `TaskStatusSettings` sin cambios de lógica, solo de estilo del contenedor.
- **V. Simplicidad primero (YAGNI)** — ⚠️ Evaluado con atención: agregar una segunda herramienta de estilos (Tailwind) mientras se mantienen 4266 líneas de CSS a mano es, en sí, más complejidad que "lo mínimo". Se justifica porque es un pedido explícito y deliberado del usuario (no una elección de este plan) para arrancar una migración ya decidida, acotado al mínimo posible en esta pasada (una sola sección, sin borrar nada, sin nuevas dependencias de testing). Ver Complexity Tracking.
- **Regla de dominio (Sectores globales/ámbito)** — ✅ Sin impacto: no se toca el modelo `Sector` ni sus reglas de ámbito (Grupo/Personal/Global, feature 046), solo su representación visual.

Sin violaciones bloqueantes — la única tensión con el principio V está justificada y documentada abajo.

## Project Structure

### Documentation (this feature)

```text
specs/047-tailwind-piloto-sectores/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

(Sin `contracts/`: esta feature no agrega ni cambia ningún endpoint de API ni contrato de datos — es una
migración de estilos puramente de frontend.)

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css                              # + 3 directivas @tailwind al inicio (sin borrar nada existente)
│   └── (main)/
│       └── sectors/
│           ├── page.tsx                          # restyle con Tailwind
│           └── [id]/
│               └── page.tsx                      # restyle con Tailwind (misma funcionalidad)
└── components/
    ├── ui/
    │   └── Dialog.tsx                             # restyle con Tailwind (única excepción fuera de Sectores)
    └── sectors/
        ├── SectorsView.tsx                        # restyle con Tailwind
        ├── SectorCard.tsx                         # restyle con Tailwind + badge de ámbito también en tabla
        └── CreateSectorDialog.tsx                 # restyle con Tailwind (contenido; usa Dialog.tsx restyleado)

tailwind.config.ts                                 # nuevo — theme mapeado a var(--...), darkMode por atributo, preflight off
postcss.config.js                                  # nuevo — tailwindcss + autoprefixer
```

**Structure Decision**: Monolito Next.js existente, sin nueva estructura de carpetas. Cambio acotado a los
archivos ya identificados en la spec, más dos archivos de configuración de build nuevos en la raíz del
proyecto (patrón estándar de Tailwind + Next.js).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| Segunda herramienta de estilos (Tailwind) conviviendo con `globals.css` a mano | Pedido explícito y ya decidido por el usuario como el arranque de una migración planeada, con el mockup ya aprobado en ese lenguaje visual | "No agregar Tailwind y rehacer el mismo diseño con CSS a mano" fue considerado y rechazado por el usuario — el pedido es específicamente usar Tailwind como herramienta, no solo lograr el resultado visual |
