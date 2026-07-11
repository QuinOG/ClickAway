# ClickAway Precision Arena UI Foundation

Status: UX-01 foundation contract. The development-only `/__ui-kit` gallery exercises this contract and the UX-02 primitives. It defines visual decisions for later migrations; it does not authorize page-level redesigns.

## Direction

ClickAway should feel like a compact precision-sport broadcast joined to a tactile arcade cabinet. Deep ink environments hold focus, bone-white type carries information, electric cyan identifies ClickAway, and mode/rank colors behave like localized lighting rather than full-card fills.

The pointer meeting a calibrated impact ring is the signature motif. Use offset rings, trajectory lines, square ticks, clipped corners, and short causal motion. Avoid anonymous glass-card grids, decorative military HUD noise, and continuous neon glow.

## Typography

The application self-hosts variable Sora and Space Grotesk through Fontsource. Both use `font-display: swap`, so content remains available if a font is delayed.

Font copyright notices and the SIL OFL 1.1 text ship in `public/fonts/`.

| Role | Token | Family | Use |
|---|---|---|---|
| Interface | `--ca-font-ui` / `--font-ui` | Sora | Controls, labels, paragraphs, tables |
| Display | `--ca-font-display` / `--font-display` | Space Grotesk | Titles, decisive moments, mode names |
| Numeric | `--ca-font-numeric` / `--font-numeric` | Space Grotesk | Score, timer, RR, progression readouts |

Display typography is reserved for moments and short labels. Do not set paragraphs in the display face. Numeric readouts should use `font-variant-numeric: tabular-nums` where changing width would distract.

The fluid scales in `tokens.css` combine rem and viewport terms with guarded minimums and maximums. Do not replace them with viewport-only sizing. Verify all uses at 200% zoom.

## Core palette

| Role | Token | Value | Contrast on raised ink surface |
|---|---|---:|---:|
| Environment void | `--ca-color-env-void` | `#050912` | — |
| Raised environment | `--ca-color-env-raised` | `#0f1b2a` | — |
| Strong ink | `--ca-color-ink-strong` | `#f3efe6` | 15.12:1 |
| Standard ink | `--ca-color-ink` | `#e2eaf3` | 14.29:1 |
| Muted ink | `--ca-color-ink-muted` | `#9baabd` | 7.33:1 |
| Identity cyan | `--ca-color-accent` | `#55d9ff` | 10.54:1 |
| Success / Practice | `--ca-color-success` | `#4eddb8` | 10.21:1 |
| Warning / Ranked | `--ca-color-warning` | `#f3c45a` | 10.62:1 |
| Error / pressure | `--ca-color-error` | `#ff665d` | 6.04:1 |

Ratios above compare solid foregrounds with `#0f1b2a`. Alpha washes are atmosphere, not text colors, and must be tested against their composited background.

## Modes

Mode colors communicate local context. A mode always retains its full name and a shape or glyph equivalent.

| Mode | Accent tokens | Shape/text equivalent |
|---|---|---|
| Practice | `--ca-mode-practice*` | Open calibration ring, `PRACTICE` |
| Casual | `--ca-mode-casual*` | Two offset impact rings, `CASUAL` |
| Ranked | `--ca-mode-ranked*` | Forward chevron or crest, `RANKED` |
| Pressure | `--ca-mode-pressure*` | Inward ticks plus explicit low-time/stakes copy |

The existing arena classes `theme-default`, `theme-sunset`, `theme-forest`, and `theme-arcade` are cosmetic contracts, not mode themes. They must not be renamed or overloaded with mode meaning.

## Ranks

The canonical rank order and token stems are `unranked`, `placement`, `bronze`, `silver`, `gold`, `platinum`, `diamond`, and `deadeye`. Every rank presentation includes the visible tier label; ranked crests remain decorative when that label is adjacent.

Existing asset paths in `public/ranks/` remain authoritative during gradual migration. Bronze, Silver, and Gold are portrait raster shields; Platinum, Diamond, and Deadeye are square SVG emblems. Always use `object-fit: contain` and verify both compact badge and large crest contexts before changing their frame.

Unranked uses a neutral dashed-ring treatment. Placement uses a five-tick track with the played/remaining count. These shape/count signals keep both states distinct when color cannot be perceived.

## Surfaces, depth, and shape

Use exactly three depth roles:

| Level | Tokens | Intended use |
|---|---|---|
| 0 — flat | `--ca-depth-0-*` | Environmental grouping, separators, quiet metadata |
| 1 — raised | `--ca-depth-1-*` | Commands, focused detail, compact readouts |
| 2 — overlay | `--ca-depth-2-*` | Dialogs, sheets, decisive result layers |

Do not use elevation merely to wrap content. A border or shadow must explain hierarchy. Use `--ca-shape-cut-sm` for controls and `--ca-shape-cut-md` for authored stages; reserve pill geometry for statuses, counters, and true binary filters.

The impact motif uses `--ca-impact-ring-*`, `--ca-impact-tick`, and `--ca-impact-line`. One dominant impact locus per composition is enough. Decorative rings never compete with the gameplay target.

## Interaction state contract

| State | Required visual and semantic evidence |
|---|---|
| Default | Stable label and purpose; default fill/line tokens |
| Hover | Local fill/line change; never reveals required information |
| Focus-visible | Two-pixel cyan outline with three-pixel offset; remains visible in forced colors |
| Pressed | Small causal compression or stronger line plus native pressed semantics where applicable |
| Selected | Accent line/fill plus text, icon, check, or `aria-selected` / `aria-pressed` state |
| Disabled | Reduced contrast, native disabled semantics, no hover/press response |
| Locked | Lock icon and short reason; never opacity alone |
| Success | Success icon/text with teal accent |
| Warning | Warning icon/text with warm accent |
| Error | Error icon/text with pressure red and recovery action where possible |
| Loading | Stable-size skeleton or progress text; no layout shift |

The `--ca-state-*` variables define fills and lines for these states. Feature CSS may compose them, but it must not redefine their meaning.

## Motion and feedback budget

Motion uses the `--ca-motion-*` duration, easing, and distance tokens. Existing engine timing and state changes remain the source of truth; animation never advances game state.

- Ordinary interaction completes within the 80–220 ms range.
- Deliberate transitions use 360 ms; 480 ms is reserved for skippable ceremony.
- A control glow is capped at 24 px and ambient light at 64 px.
- Use no more than two authored shadow layers on one element.
- A flash is capped at 0.18 opacity and 120 ms.
- Repeating motion requires a state reason; ambient breathing is not a default treatment.

Under `prefers-reduced-motion: reduce`, foundation travel distances and flash opacity resolve to zero, accent glows resolve to none, and loading shimmer is static. State, text, icon, and opacity changes must still communicate the outcome.

## Target and cosmetic clarity

Cosmetics may change target artwork but never geometry, hitbox, state timing, or essential outline.

- Apply the light/dark double boundary defined by `--ca-target-contrast-shadow` independently of the image.
- The boundary must reach at least 3:1 against every arena immediately beside it.
- Keep a text or shape cue for disabled, ready, active, and hit states.
- Test all four arena themes and representative very light, dark, detailed, and transparent skins.
- Do not solve low contrast by changing the server-authoritative target size.
- Effects and cosmetic overflow must remain `pointer-events: none`.

## Brand asset reference

`public/brand/clickaway-mark.svg` is the authored pointer/impact reference and `public/brand/clickaway-favicon.svg` is its small-size reduction. The mark uses only foundation ink, cyan, and bone, contains no font outline, and remains recognizable in monochrome.

The application shell uses the authored SVG mark. The legacy `public/pointerimage.png` stays available for compatibility with existing cosmetics; it is not a vector source and should not be upscaled or traced into future lockups.

## Legacy aliases

Existing properties such as `--surface-0`, `--panel`, `--ink`, `--brand`, `--positive`, `--radius-*`, `--space-*`, `--dur-*`, and `--z-*` resolve through canonical `--ca-*` values. New work should consume canonical or stable short font aliases. Do not delete a legacy alias until repository-wide search proves it has no consumers and the migration mission owns that cleanup.

## Documented reference fixture

Open `/__ui-kit` while the Vite development server is running. The route is not compiled into production and does not appear in navigation. Review the foundation as one matrix, in this order:

1. Render UI, display, and numeric families at every token size with short and wrapping samples.
2. Show environment levels 0–2 with strong, standard, muted, and accent text.
3. Show Practice, Casual, Ranked, and pressure treatments with both color and their shape/text equivalent.
4. Render `TierBadge` for Unranked, Placement 0/5 and 4/5, Bronze I, Silver II, Gold III, Platinum I, Diamond III, and Deadeye.
5. Render one control through default, hover, focus-visible, pressed, selected, disabled, locked, success, warning, error, and loading states.
6. Show small, medium, and large impact motifs beside the full and favicon brand marks.
7. Place the cosmetic-independent target boundary over every legacy arena theme.
8. Repeat focus, loading, and impact samples with reduced motion enabled and at 200% zoom.

This matrix is the UX-01 acceptance reference. Later primitive and page missions may implement it in a development gallery without changing this semantic contract.

## Verification

- `npm run build`
- `npm test`
- `npm run lint`
- Search the built output and source for `fonts.googleapis.com`; expected count is zero.
- Load once with the network offline and confirm local fonts fall back without hidden text or layout clipping.
- Check keyboard focus and forced-colors mode.
- Check the documented fixture at 390 px width and 200% zoom.
- Check every mode/rank mapping without relying on color alone.
