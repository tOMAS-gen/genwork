# Implementation Plan: OG Tags & Favicon

**Branch**: `030-og-favicon` | **Date**: 2026-07-06 | **Spec**: [spec.md](spec.md)

## Summary

Generar los favicon (SVG + PNG multi-tamaño + ICO) con el diseño "›w" sobre fondo azul, crear la imagen OG (1200×630), configurar los meta tags en el layout raíz de Next.js y agregar web app manifest.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 20

**Primary Dependencies**: Next.js 15.3 (App Router, Metadata API)

**Target Platform**: Web (todos los navegadores modernos)

**Project Type**: Web application

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I-IV | No — feature de presentación, no cambia modelo de datos | ✅ PASS |
| V. Simplicidad | Sí — archivos estáticos en public/, metadata en layout.tsx | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/030-og-favicon/
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
public/
├── favicon.ico              # NUEVO: ICO 32×32
├── favicon.svg              # NUEVO: SVG vectorial
├── favicon-16x16.png        # NUEVO
├── favicon-32x32.png        # NUEVO
├── apple-touch-icon.png     # NUEVO: 180×180
├── icon-192.png             # NUEVO: para manifest
├── og-image.png             # NUEVO: 1200×630
└── site.webmanifest         # NUEVO

src/app/
└── layout.tsx               # EXISTENTE: agregar metadata OG + favicon links
```

**Structure Decision**: Archivos estáticos en `public/`, metadata via export `metadata` en `layout.tsx`.

## Design Decisions

- **Favicon SVG como base**: SVG vectorial con "›w" sobre fondo azul (#2563EB), texto blanco. Los PNG se generan con un script Node temporal.
- **Next.js Metadata API**: usar el export `metadata` en `layout.tsx` para OG tags y favicon references.
- **og-image**: archivo estático PNG 1200×630, generado una vez. Logo "›w" centrado sobre fondo azul.

## Complexity Tracking

Sin violaciones a la constitution.
