<!--
Sync Impact Report
==================
Version change: (unfilled template) → 1.0.0
Rationale: Initial ratification. MAJOR (1.0.0) because this establishes the
governance baseline for the first time; there is no prior versioned constitution
to compare against.

Principles defined (all NEW — first ratification):
- I. Information at a Glance (NON-NEGOTIABLE UX)
- II. Opinionated over Flexible
- III. Spec-Driven Delivery (NON-NEGOTIABLE)
- IV. Design System Consistency
- V. Accessibility & Inclusion (WCAG AA — NON-NEGOTIABLE)
- VI. Test-Backed Changes
- VII. Perceived Speed & Observability

Added sections:
- Additional Constraints (stack + operational rules)
- Development Workflow (Spec Kit gates + review cadence)
- Governance (versioning, amendments, compliance)

Removed sections: none (template was empty).

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — verified; Constitution Check placeholder is
  compatible; downstream plans MUST cite the principle IDs above.
- ✅ .specify/templates/spec-template.md — verified; scope and requirement sections
  align with Principles I, II, IV, V.
- ✅ .specify/templates/tasks-template.md — verified; task categorization already
  covers Setup / Tests / Core / Integration / Polish which map to Principles III, VI, VII.
- ⚠ Spec Kit command files (.opencode/commands/speckit.*.md) — no changes required
  by this ratification; agent-generic wording preserved. Re-check on future MINOR/MAJOR bumps.
- ⚠ README.md — none present at repo root; PRODUCT.md and DESIGN.md remain the
  runtime guidance references and are consistent with this constitution.

Deferred / TODO items:
- RATIFICATION_DATE: set to 2026-07-28 (today) since no earlier adoption record
  exists in the repository. Adjust if an earlier date is discovered.
-->

# genwork Constitution

## Core Principles

### I. Information at a Glance (NON-NEGOTIABLE UX)
The state of a project, sector, group, or task MUST be understandable without
clicking. Cards, drawers, and list headers MUST surface the numbers, colors, and
dates that answer "what is pending, what is on time, what needs me". Counters
(e.g. unfinished tasks) MUST appear on every aggregation level where users make
scanning decisions — global titles, per-project titles, per-sector titles, and
per-group titles — and MUST reflect the same source of truth to avoid contradictions
between views. Rationale: The product exists to eliminate the "let me ask what's
pending" conversation; hidden information defeats the product.

### II. Opinionated over Flexible
When two UX paths are viable, choose one and remove the other. Fewer options,
clearer flow. New features MUST NOT introduce user-facing configuration for
behavior the product can decide itself (e.g. sort order, grouping strategy) unless
a clarify-phase decision explicitly justifies the toggle. Rationale: Genwork
differentiates from Jira/Monday.com by refusing to become a lienzo en blanco.

### III. Spec-Driven Delivery (NON-NEGOTIABLE)
Every feature MUST flow through the Spec Kit phases: constitution → specify →
clarify → plan → checklist → tasks → analyze → implement → converge. Tasks MUST
carry `[C:complexity->model]` labels per `.specify/models.json`. Skipping clarify
or analyze is prohibited even when the change looks small; use `--bypass` only to
skip the implementation confirmation gate, never the quality gates. Rationale:
The repo already has 50+ specs; consistency of process is what keeps the codebase
navigable.

### IV. Design System Consistency
All UI work MUST use tokens and components defined in `DESIGN.md` and the
`design-system/` and `.design-system/` folders: Inter typography, the fixed rem
scale, the 4px spacing base, the 10-color palette, and the semantic tokens for
color/border/shadow. New visual primitives (badges, counters, indicators) MUST
either reuse an existing pattern or be added to the design system first, then
consumed. Ad-hoc styles inside feature components are prohibited. Rationale:
"Consistencia sobre sorpresa" — the same vocabulary in every screen.

### V. Accessibility & Inclusion (WCAG AA — NON-NEGOTIABLE)
Every change MUST preserve or improve: 4.5:1 minimum contrast for text,
keyboard navigability for all interactive elements, visible focus states,
correct roles/labels for icon-only controls, and `prefers-reduced-motion`
respect. Both light and dark themes MUST remain functional. Counters and status
indicators MUST NOT rely on color alone (pair color with number or icon).
Rationale: The user base works long shifts in workshop/office environments;
accessibility is baseline, not a nice-to-have.

### VI. Test-Backed Changes
Every feature that alters data derivation, sorting, aggregation, or a public
API MUST land with automated tests. Vitest is the standard runner
(`vitest.config.ts` present). At minimum: (a) unit tests for pure derivation
functions (counts, sorts, filters), (b) contract tests for any API route that
changes shape, and (c) a component/interaction test when the change affects an
ordering or visibility rule that a user would notice. Purely cosmetic changes
covered by the design system are exempt. Rationale: Aggregation logic is where
silent regressions hide; tests are the only defense.

### VII. Perceived Speed & Observability
Interactions MUST feel immediate: skeletons for loads >150ms, optimistic UI
where safe, transitions 150–250ms. Server work that computes aggregates MUST
be efficient (single query or memoized) and MUST be observable via the existing
error-logging pathway (spec 041). Regressions in perceived speed on the
drawer, dashboard, or project detail views are treated as bugs. Rationale: The
brand is "práctico, limpio, directo"; slow feels neither.

## Additional Constraints

- **Stack**: Next.js (App Router) + TypeScript strict + Prisma + Tailwind + Vitest.
  New runtime dependencies require justification in the plan's Constitution Check.
- **Data model**: Prisma migrations MUST be additive when possible; destructive
  migrations require an explicit note in the spec and a rollback plan.
- **Deployment**: Docker-based; CI (spec 029) MUST pass before merge.
- **Storage of files**: Follow specs 028/034/051 (Nextcloud / Google Drive) for
  external file placement; do not introduce new storage backends without a spec.
- **Auth**: Google OAuth compliance rules from spec 038 MUST be honored.
- **Localization**: Product copy is Spanish (Argentina). Keep user-facing strings
  in Spanish; keep code identifiers in English.

## Development Workflow

- **Branching**: One feature = one branch, named `NNN-slug` matching the spec
  folder in `specs/`.
- **Spec Kit gates**: `clarify` and `analyze` are mandatory. `checklist` failures
  MUST be fixed at the source (spec/plan), not silenced.
- **Reviews**: Any change touching aggregation, ordering, permissions, or shared
  UI primitives requires review from a reviewer familiar with the affected spec
  area. Reviewers verify constitution compliance, not just code style.
- **Model dispatch**: Task complexity labels MUST route to the model tiers in
  `.specify/models.json`. `tier: "max"` models are reserved for the manager role
  and exceptional cases; do not use them as the default implementer.
- **Definition of done**: spec + plan + tasks committed; implement phase green;
  converge reports converged; tests added per Principle VI; no CRITICAL findings
  in analyze.

## Governance

- This constitution supersedes ad-hoc conventions. In case of conflict with an
  older spec, the constitution wins and the spec MUST be updated.
- **Amendments** require: (a) a PR that edits this file, (b) a Sync Impact
  Report at the top of the file, (c) propagation to `.specify/templates/*` and
  affected Spec Kit command files when semantics change, and (d) a version bump
  per the rules below.
- **Versioning** (semver):
  - MAJOR: removal or redefinition of a principle, or backward-incompatible
    governance change.
  - MINOR: new principle, new mandatory section, or materially expanded rule.
  - PATCH: wording, typo, clarification, or non-semantic refinement.
- **Compliance review**: Every PR description MUST state which principles were
  touched and how they were honored. Reviewers MUST reject PRs that silently
  regress a NON-NEGOTIABLE principle.
- **Runtime guidance**: `PRODUCT.md` (product intent) and `DESIGN.md` (visual
  language) are the two runtime companions to this constitution. Keep all three
  consistent on every amendment.

**Version**: 1.0.0 | **Ratified**: 2026-07-28 | **Last Amended**: 2026-07-28
