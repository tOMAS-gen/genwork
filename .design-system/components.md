# Design System — Component Specs

## Typography
- Font: Arial, sans-serif
- Headings: bold (700), heading color (#FFF)
- Body: body color (#9CA3AF), 16px, 1.6 line-height
- h1: 64px desktop / 36px mobile, line-height 1.05
- h2: 48px desktop / 30px mobile, line-height 1.1
- h3: 36px desktop / 24px mobile, line-height 1.2
- Links: fg-brand, underline, hover → no underline

## Layout
- Base spacing unit: 8px
- Section padding: 96px vertical
- Container: max-width 1152px, centered, 24px horizontal padding
- All backgrounds: black (#000000)

## Border Radius Scale
| Token | Value | Usage |
|---|---|---|
| base | 16px | Buttons, cards, inputs, modals |
| default | 10px | Badges, tooltips, dropdown items |
| sm | 6px | Checkboxes |
| full | 9999px | Pills, avatars, toggles |

## Shadows
| Token | CSS |
|---|---|
| shadow-xs | 0 1px 2px 0 rgb(0 0 0 / 0.04) |
| shadow-sm | 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06) |
| shadow-md | 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05) |
| shadow-lg | 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04) |
| shadow-xl | 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04) |

## Buttons
- Radius: 16px, border: 1px, shadow-xs
- Glint effect (all except ghost/disabled): shadow-xs + inset highlight + outer glow
- Brand: bg #FF6C00, text white, hover #CC5500
- Secondary: bg #0A0A0A, border #2A2A2A, text body
- Ghost: transparent, no shadow/glint
- Disabled: bg #111111, text #52525B, cursor not-allowed
- Sizes: xs(12px/6px), sm(14px/8px), base(14px/10px), lg(16px/12px), xl(16px/14px)

## Cards
- Background: #000000
- Border: 1px #222222
- Radius: 16px
- Shadow: shadow-xs
- Interactive hover: #0A0A0A

## Inputs
- Background: #0A0A0A
- Border: 1px #2A2A2A
- Radius: 16px
- Padding: 12px h, 10px v
- Focus: border #FF6C00, ring 1px brand
- Placeholder: #9CA3AF

## Sidebar
- Background: #000000
- Right border: 1px #222222
- Width: 256px
- Nav items: 8px padding, 16px radius, hover #0A0A0A
- Active: bg #111111, text #FF8C33
- Icons: 20x20px

## Tabs (Underline)
- 14px, medium weight
- Active: fg-brand text, brand bottom border 2px
- Inactive hover: heading text, border-default-strong bottom border

## Badges
- Radius: 10px (or 9999px pill)
- Brand: bg #1C0D00, border #6B2E00, text #FF8C33
- Sizes: sm(12px/6px/2px), lg(14px/8px/4px)

## Modals
- Overlay: fixed, black 50% opacity, backdrop blur
- Content: bg #000000, radius 16px, shadow-xl
- Header/footer: separated by border-default

## Dropdowns
- Menu: bg #000000, border #222222, radius 16px, shadow-lg
- Items: 8px padding, 10px radius, hover #1A1A1A
