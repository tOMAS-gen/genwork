# Implementation Plan: Edición inline de tareas y navegación mejorada

**Branch**: `004-edicion-tareas-navegacion` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-edicion-tareas-navegacion/spec.md`

## Summary

Cuatro mejoras sobre genwork (001-003): (1) edición inline de tareas estilo Notion (tocar el
texto → editar en el lugar, Enter/blur guarda re-parseando, Esc cancela) en proyecto y sector;
(2) fix del direccionado `/otro-proyecto` desde un proyecto — causa raíz diagnosticada: los
nombres con espacios rompen el parseo/resolución/autocompletado de la etiqueta `/`; (3) dashboard
con el drawer real de la app (colapsable) en lugar del hamburguesa flotante; (4) drawer con
Grupos expandibles, ícono de Administración, colapso global persistente y tema
claro/oscuro/sistema. Sin cambios de modelo de datos ni API nueva (solo se ajusta la resolución
de etiquetas en el servicio existente). Prioridad funcionalidad > estética.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (proyecto existente)

**Primary Dependencies**: las ya instaladas (Next.js 15, Prisma, TipTap, Lucide). Sin deps nuevas

**Storage**: sin cambios de schema. Preferencias de tema y drawer en `localStorage` (por
dispositivo, assumption de spec)

**Testing**: Vitest para la lógica pura nueva/ajustada: matching de etiquetas tolerante a
espacios/guiones y resolución; el resto UI por quickstart

**Target Platform**: web (igual que hoy)

**Project Type**: web application (mismo proyecto)

**Performance Goals**: edición inline abre al toque (< 100 ms percibido); cambio de tema sin
flash (script temprano anti-FOUC)

**Constraints**: no romper el parser de etiquetas existente (tests intactos); contraste ≥ 4.5:1
en ambos temas; rol Lector sin navegación; estados de drawer/tema persistentes por dispositivo

**Scale/Scope**: ~10 componentes tocados, 1 servicio ajustado (resolución), 0 migraciones

## Constitution Check

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Tarea única, múltiples vistas | La edición inline usa el PATCH existente que re-parsea y actualiza la única entidad; mudar de proyecto es actualizar `workId`, nunca copiar. | ✅ |
| II. Etiquetado inline | Refuerza: el fix hace que `/proyecto` funcione con nombres reales (con espacios); mismo autocompletado en edición. | ✅ |
| III. Trabajo = Doc + Tareas | Sin cambios de estructura de la hoja. | ✅ |
| IV. Estados simples e historial | Editar no toca el estado; tareas realizadas siguen visibles y editables. | ✅ |
| V. Simplicidad (YAGNI) | Sin deps nuevas, sin schema, preferencias en localStorage; matching tolerante en la capa de resolución (no se complica el parser). | ✅ |
| Tests core | Matching de nombres con espacios/guiones + resolución: tests unitarios nuevos. | ✅ |

**Re-check post Phase 1**: ✅ — sin entidades nuevas; el parser NO se modifica (solo la
resolución y el texto que inserta el autocompletado).

## Diagnóstico del bug `/proyecto` (US2)

- El parser (correctamente) corta la etiqueta en el primer espacio: `/Tina - Remodelación…` se
  parsea como `/Tina`.
- La resolución (`src/server/tasks.ts:149`) exige igualdad exacta del nombre completo
  normalizado → `/Tina` no matchea "Tina - Remodelación de paneles" → 409 unresolvedTags.
- El autocompletado (`TaskListEditor.tsx:73`, `TaskInput.tsx:62`) inserta `s.name` CON espacios,
  generando etiquetas imparseables.
- Los sectores funcionan porque sus nombres son de una palabra → el usuario percibió "solo
  funciona en sectores".

**Fix (research R1)**: matching tolerante en la resolución (espacios ≡ guiones, y prefijo único
como fallback) + el autocompletado inserta el nombre en forma etiquetable (espacios→guiones).
El parser no cambia.

## Project Structure

### Documentation (this feature)

```text
specs/004-edicion-tareas-navegacion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── delta.md
└── tasks.md
```

### Source Code (cambios sobre el proyecto existente)

```text
src/
├── lib/domain/tags/
│   └── matching.ts                 # NUEVO: tagMatchesName / toTagForm (puro, testeado)
├── server/
│   └── tasks.ts                    # resolución usa matching tolerante (works y sectores)
├── app/api/tags/suggest/route.ts   # matching de sugerencias tolerante
├── components/tasks/
│   ├── TaskItem.tsx                # modo edición inline (usa el editor compartido)
│   ├── TaskInlineEdit.tsx          # NUEVO: input de edición con autocomplete compartido
│   ├── useTagAutocomplete.ts       # NUEVO: hook compartido captura+edición (extrae lógica)
│   ├── TaskListEditor.tsx          # usa hook compartido + toTagForm al insertar + aviso "enviada a"
│   └── TaskInput.tsx               # ídem (vista de sector)
├── components/nav/
│   ├── DrawerNav.tsx               # + Grupos expandibles, ícono admin, selector de tema
│   └── BoardNav.tsx                # SE ELIMINA (reemplazado por drawer colapsable)
├── components/ui/
│   ├── Toast.tsx                   # NUEVO: aviso "Tarea enviada a /X" auto-dismiss
│   └── ThemeToggle.tsx             # NUEVO: claro/oscuro/sistema (localStorage + data-theme)
├── app/
│   ├── layout.tsx                  # script anti-FOUC de tema
│   ├── (main)/layout.tsx           # drawer colapsable global (estado en localStorage)
│   ├── board/…                     # el dashboard usa el drawer colapsable; Lector mantiene
│   │                               #   pantalla limpia (render condicional por rol)
│   └── globals.css                 # variables de tema oscuro ([data-theme]) + estilos colapso

tests/unit/
└── tag-matching.test.ts            # espacios/guiones/prefijo único/ambigüedad
```

**Structure Decision**: la lógica compartida de autocompletado se extrae a un hook
(`useTagAutocomplete`) para no duplicarla en captura (proyecto), captura (sector) y edición
inline. El matching tolerante vive en `src/lib/domain/tags/matching.ts` (puro, testeado) y lo
consumen la resolución del servidor y el endpoint de sugerencias. El dashboard se integra al
layout con drawer colapsable; para Lector se mantiene la vista limpia actual.

## Complexity Tracking

> Sin violaciones: cero dependencias nuevas, cero migraciones. El único punto delicado es el
> matching tolerante — se aísla como función pura con tests para no tocar el parser (tests
> existentes intactos).
