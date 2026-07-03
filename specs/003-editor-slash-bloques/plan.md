# Implementation Plan: Editor de documento con menú slash (bloques estilo Notion)

**Branch**: `003-editor-slash-bloques` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-editor-slash-bloques/spec.md`

## Summary

Agregar al editor de documentación del proyecto (TipTap, feature 002) un menú de inserción por
barra inclinada ("/") con los bloques básicos (Texto, Encabezado 1-4, Lista con viñetas, Imagen) y
una barra flotante de formato inline (Negrita/Cursiva) al seleccionar texto. Reemplaza la barra de
botones fija actual. Sin cambios de datos ni de API: el documento se guarda igual (JSON de
ProseMirror). Todo el trabajo es frontend en el componente del editor.

Base visual: [design-system/genwork/MASTER.md](../../design-system/genwork/MASTER.md) — Flat
minimalista, Inter, íconos Lucide. Detalle en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 (proyecto existente)

**Primary Dependencies**: TipTap 2 (ya integrado: `@tiptap/react`, `starter-kit`, `extension-image`,
`extension-placeholder`); se agregan `@tiptap/suggestion` (ya presente como dep transitiva/directa)
y `@tiptap/extension-bubble-menu` para la barra flotante. El menú slash se implementa con una
extensión de TipTap basada en `Suggestion` (trigger `/`), renderizando la lista con componentes
propios + íconos Lucide (ya instalado)

**Storage**: Sin cambios. El documento sigue persistiendo como JSON de ProseMirror en `DocPage`
(feature 001). No hay migración

**Testing**: Vitest para la lógica pura nueva (definición/filtrado de los ítems del menú slash);
la interacción del editor se valida manualmente vía quickstart

**Target Platform**: Web escritorio/móvil (mismo editor de la hoja de proyecto)

**Project Type**: Web application (mismo proyecto Next.js)

**Performance Goals**: Menú aparece < 150 ms tras "/"; filtrado en vivo sin lag perceptible

**Constraints**: No romper el guardado del documento (FR-208); no interferir con el "/" del input
de tareas (FR-209); atajos markdown siguen andando (FR-210); accesibilidad de teclado completa en
el menú (flechas/Enter/Esc) y foco visible

**Scale/Scope**: 1 componente (DocEditor) + 2-3 componentes nuevos de UI del editor; sin backend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Tarea única, múltiples vistas | No toca tareas ni vínculos; es solo el editor del documento. | ✅ |
| II. Etiquetado inline como interfaz primaria | El slash del documento es un contexto separado del `/` de tareas (FR-209); no altera el parser de etiquetas. | ✅ |
| III. Trabajo = Documentación + Tareas | Mejora la mitad "Documentación" de la hoja sin separar nada. | ✅ |
| IV. Estados simples e historial visible | No toca estados de tareas. | ✅ |
| V. Simplicidad primero (YAGNI) | Alcance acotado a 6 bloques + inline básico; integraciones IA/HTML fuera. Extensiones TipTap livianas, sin datos nuevos. | ✅ |
| Flujo de desarrollo (tests core) | La definición/filtrado de ítems del menú se aísla como función pura testeable. | ✅ |

**Re-check post Phase 1**: ✅ — sin entidades ni contratos nuevos; solo UI del editor.

## Project Structure

### Documentation (this feature)

```text
specs/003-editor-slash-bloques/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── editor.md        # contrato de UI del editor (no HTTP)
└── tasks.md
```

### Source Code (cambios sobre el proyecto existente)

```text
src/
├── components/editor/
│   ├── DocEditor.tsx              # integra slash + bubble menu; quita la barra fija (FR-204..212)
│   ├── SlashMenu.tsx              # lista flotante de bloques (teclado + mouse) (FR-201/202/203)
│   ├── slashCommand.ts            # extensión TipTap (Suggestion, trigger "/") (FR-201/206)
│   └── InlineToolbar.tsx          # BubbleMenu Negrita/Cursiva (FR-211/212)
└── lib/domain/editor/
    └── slash-items.ts             # definición + filtrado puro de los bloques (FR-204)

tests/unit/
└── slash-items.test.ts           # filtrado por query, límites, sin resultados
```

**Structure Decision**: Todo el trabajo vive en `src/components/editor/`. La única lógica pura
(catálogo de bloques y su filtrado por texto) se aísla en `src/lib/domain/editor/slash-items.ts`
para test unitario; el resto es integración con TipTap. Sin tocar API, modelo ni otras pantallas.

## Complexity Tracking

> Sin violaciones. Se agregan extensiones oficiales de TipTap (`@tiptap/suggestion`,
> `@tiptap/extension-bubble-menu`), livianas y alineadas con el editor ya en uso; no ameritan
> tabla de complejidad.
