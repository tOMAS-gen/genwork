# Color Tokens

## Background Tokens

### Neutral
| Token | Light | Dark |
|---|---|---|
| neutral-primary-soft | #000000 | #000000 |
| neutral-primary | #000000 | #000000 |
| neutral-primary-medium | #050505 | #050505 |
| neutral-primary-strong | #0A0A0A | #0A0A0A |
| neutral-secondary-soft | #000000 | #000000 |
| neutral-secondary | #000000 | #000000 |
| neutral-secondary-medium | #0A0A0A | #0A0A0A |
| neutral-secondary-strong | #111111 | #111111 |
| neutral-tertiary-soft | #0A0A0A | #0A0A0A |
| neutral-tertiary | #111111 | #111111 |
| neutral-tertiary-medium | #1A1A1A | #1A1A1A |
| neutral-quaternary | #222222 | #222222 |
| quaternary-medium | #2A2A2A | #2A2A2A |
| gray | #3A3A3A | #3A3A3A |

### Brand
| Token | Light | Dark |
|---|---|---|
| brand-softer | #1C0D00 | #1C0D00 |
| brand-soft | #331400 | #331400 |
| brand | #FF6C00 | #FF6C00 |
| brand-medium | #331400 | #331400 |
| brand-strong | #CC5500 | #CC5500 |

### Status
| Token | Light | Dark |
|---|---|---|
| success-soft | #001A12 | #001A12 |
| success | #009966 | #009966 |
| success-medium | #002E1F | #002E1F |
| success-strong | #007A55 | #007A55 |
| danger-soft | #1A0008 | #1A0008 |
| danger | #C70036 | #C70036 |
| danger-medium | #330010 | #330010 |
| danger-strong | #A50036 | #A50036 |
| warning-soft | #1A0E00 | #1A0E00 |
| warning | #F97316 | #F97316 |
| warning-medium | #331C00 | #331C00 |
| warning-strong | #C2410C | #C2410C |

### Button Glint
| Variable | Value |
|---|---|
| `--color-1-400` | rgba(255,255,255,0.12) |
| `--color-1-700` | rgba(0,0,0,0.25) |

### Utility
| Token | Value |
|---|---|
| dark | #E5E7EB |
| dark-strong | #D1D5DC |
| disabled | #111111 |

### Accent
| Token | Value |
|---|---|
| purple | #A855F7 |
| sky | #0EA5E9 |
| teal | #0D9488 |
| pink | #DB2777 |
| cyan | #06B6D4 |
| fuchsia | #C026D3 |
| indigo | #4F46E5 |
| orange | #FF6C00 |

## Text Color Tokens

### Base
| Token | Value |
|---|---|
| white | #FFFFFF |
| black | #000000 |
| heading | #FFFFFF |
| body | #9CA3AF |
| body-subtle | #71717A |

### Brand
| Token | Value |
|---|---|
| fg-brand-subtle | #FFCFA3 |
| fg-brand | #FF6C00 |
| fg-brand-strong | #FF8C33 |

### Status
| Token | Value |
|---|---|
| fg-success | #10B981 |
| fg-success-strong | #34D399 |
| fg-danger | #F43F5E |
| fg-danger-strong | #FB7185 |
| fg-warning-subtle | #F97316 |
| fg-warning | #FBBF24 |
| fg-disabled | #52525B |

## Border Color Tokens

| Token | Value |
|---|---|
| border-dark | #4B5563 |
| border-buffer | #000000 |
| border-default-subtle | #1A1A1A |
| border-default | #222222 |
| border-default-medium | #2A2A2A |
| border-default-strong | #333333 |
| border-success-subtle | #064E3B |
| border-danger-subtle | #881337 |
| border-warning-subtle | #92400E |
| border-brand-subtle | #6B2E00 |
| border-brand | #FF6C00 |

## Semantic Usage Rules

- Page backgrounds: neutral-primary-soft (#000000)
- Primary buttons: brand (#FF6C00)
- Headings: heading (#FFFFFF)
- Body text: body (#9CA3AF)
- CTA links: fg-brand
- Default borders: border-default (#222222)
- No raw hex in components — always tokens
- No brand text for long-form paragraphs
