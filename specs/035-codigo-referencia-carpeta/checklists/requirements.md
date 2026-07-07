# Specification Quality Checklist: Código de referencia legible de la carpeta del proyecto

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-06
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Clarificado (Session 2026-07-06):
  - Formato exacto = **`NOMBRE_DEL_GRUPO-NÚMERO-NOMBRE_DEL_PROYECTO`** en MAYÚSCULAS, partes unidas por `-`, espacios internos → `_`, nombre COMPLETO del grupo (ej. `FARMACIA_CENTRAL-23-MUEBLE_LIVING`); personales usan `PERSONAL`.
  - Se muestra en un apartado de la vista del proyecto y es el nombre de la carpeta.
  - **Solo proyectos nuevos** crean la carpeta con el código; los existentes solo lo muestran (no se renombran).
- Checklist 16/16. Spec lista para `/speckit-plan`.
