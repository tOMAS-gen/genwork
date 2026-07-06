# Design System — genwork

## Register
product

## Visual Identity

### Color
- **Strategy**: Restrained. Tinted neutrals + single blue accent.
- **Background**: `#f8fafc` (near-white cool gray)
- **Surface**: `#ffffff` (pure white cards)
- **Text**: `#0f172a` (near-black slate)
- **Muted**: `#64748b` (mid slate)
- **Accent**: `#2563eb` (blue-600)
- **Accent-soft**: `#eff4ff` (blue wash)
- **Border**: `#e4e5e7` (light gray)
- **Danger**: `#dc2626` / **Success**: `#16a34a`
- **Dark theme**: full token override via `[data-theme="dark"]`

### Typography
- **Family**: Inter (single family, all weights 300–700)
- **Scale**: fixed rem — xs(12) / sm(14) / base(16) / lg(18) / xl(22) / 2xl(28)
- **Scale ratio**: ~1.2 (minor third)

### Spacing
- **Base unit**: 4px
- **Scale**: 4 / 8 / 12 / 16 / 24 / 32 / 48

### Borders & Radius
- **Default radius**: 10px
- **Scale**: sm(4) / md(8) / lg(12)
- **Border color**: `--border` token

### Shadows
- Minimal flat style. Three levels: sm / md / lg.
- Dark theme uses heavier opacity.

### 10-Color Palette (labels, dots, sector cards)
red / orange / amber / green / teal / blue / indigo / violet / pink / gray — each with bg/text/accent triplet.

## Component Conventions
- Flat cards with 1px border, subtle shadow-sm on hover
- Pills/badges: border-radius ~6-8px (rectangular, not ovaladas)
- Single font family throughout (Inter)
- Consistent state vocabulary: hover → `--hover-soft`, active → accent, disabled → muted

## Motion
- 150–250ms transitions for state changes
- No orchestrated page-load sequences
- `prefers-reduced-motion` respected

## Dark Mode
- Full token swap via `[data-theme="dark"]`
- Semantic palette maintained with adjusted chroma for contrast
