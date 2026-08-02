# aiticker design system — THE PRICE GUIDE

Identity: a beloved 90s hobby-shop price guide magazine covering the AI
industry. Ink on newsprint; never a SaaS template.

## Tokens
| Token | Value | Use |
|---|---|---|
| Newsprint | `#F2EDE3` | page background + halftone dots (radial-gradient rgba(30,36,48,.05) .6px / 4px grid) |
| Paper | `#FDFBF6` | panels, cards |
| Ink | `#1E2430` | text, borders, table headers |
| Ink-2 | `#5A6070` | secondary text |
| Ink-3 | `#9AA0AC` | muted text, dotted dividers |
| Accent red | `#C23B2E` (hover `#A32F24`) | hot list, badges, primary CTAs |
| Market green | `#1F7A3D` | up moves |

## Type
- **Archivo Black** (`--font-display`, applied to h1/h2 + `.font-display`): mastheads, card names, section heads — uppercase, tight.
- **Oswald** (mapped over the legacy `--font-geist-mono` var, so every `font-mono` class renders Oswald): labels, tables, badges, buttons — letterspaced uppercase.
- **Lora** (mapped over `--font-geist-sans`): body/editorial; italic for quips and flavor.

## Signature elements
- `.paper-card` / `.paper-shadow`: 2px ink border + hard 5px offset shadow (print-cut paper — never soft blur).
- `.coupon`: 2px dashed ink border — clip-out CTAs.
- Dotted 1px `#9AA0AC` row dividers; 1.5–3px solid ink structural borders.
- `.paper-in`: papery drop-in with tiny rotation settle. Reduced motion kills all animation.
- Masthead: wordmark ai**ticker** (red accent word), issue line (weeks since 2026-08-01), black tag bar.
- Price guide table: black header row, zebra rows, LO/HI book values (price ×0.95/×1.08), RC chips, italic muted artifact rows, AGI unpriced.
- Editorial voice: empty states and fine print signed "— The Editor".

Contrast: ink #1E2430 on cream #F2EDE3 = 12.6:1; #5A6070 on cream = 5.5:1; red #C23B2E on cream = 5.0:1; cream text on ink/red blocks all pass AA.
