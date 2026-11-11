# Round 7 decisions (run 2, round 1), built from the i6 baseline read

Baseline (i6, new council): **Sol 8.0 (med) · Opus 5 7.8 (low) · Gemini 4 Argon 8.3 (med) · Qwen3.8 Max 8.2 (med)**

Judge weights are set by distance below each judge's stop bar (Sol 9.4, others 9.0):

| Judge | Bar | Score | Gap | Weight |
|---|---|---|---|---|
| Sol | 9.4 | 8.0 | 1.4 | ×1.3 |
| Opus | 9.0 | 7.8 | 1.2 | ×1.15 |
| Qwen | 9.0 | 8.2 | 0.8 | ×1.0 |
| Gemini | 9.0 | 8.3 | 0.7 | ×1.0 |

Other multipliers:
- Confidence: high 1.0 · med 0.7 · low 0.4.
- Consensus: ×1 / ×1.2 / ×1.4 / ×1.6 for 1–4 judges.
- Don't-bother penalty: −0.15 × that judge's weight. Two or more judges listing it vetoes the item.
- Cost: S 1 · M 2 · L 3.

| Cluster | Sol | Opus | Gemini | Qwen | Value | Cost | V/C | Decision |
|---|---|---|---|---|---|---|---|---|
| **C. Ladder: real podium (stepped stages, spotlight), "Your standing" as one rank plate, framed search** | +0.15 (part of #2) med → .14 | +0.3 med → .24 | +0.2 high → .20 | +0.1 low → .04 | .62 × 1.6 = **0.99** | M | 0.50 | **PICK** |
| **B1. Global nav as a framed game bar: plaque tabs, labeled medallions for the 4 glyph buttons, framed player/coin plate** | — | (env #2) | — | +0.4 high → .40 | **0.40**; it appears on 10+ screens | M | 0.20 | **PICK** (Qwen #1) |
| **A. Shop storefront: large inspection stage for the equipped/selected item, category shelves, physical tabs** | +0.3 high → .39 | +0.5 high → .58 | +0.1 med → .07 | (Don't bother: more items, not structure) | 1.04 × 1.4 = **1.45** | L | 0.48 | **PICK** (Sol #1, Opus #1). Keep the item cards' art and frames (Gemini and Qwen protect them). |
| **D. Armory right rail: stat strip and swap report become segmented gauges and recessed hardware slots; engraved step switch** | +0.2 high → .26 | — | +0.2 high → .20 | — | .46 × 1.2 = **0.55** | M | 0.28 | **PICK** (Gemini #1). Keep the numeric trade-offs readable (Sol protects them). |
| G. Bare inputs (login, ladder search, duels taunt) become framed game fields with icon caps | — | — | +0.1 med → .07 | +0.2 med → .14 | .21 × 1.2 = 0.25 | S | 0.25 | **PICK** (cheap) |
| B2. A different environment per screen (Ladder stadium board, History locker wall, Profile locker) | +0.3 med → .27 | +0.4 high → .46 | — | — | .73 × 1.2 = 0.88 | L | 0.29 | partly: Ladder gets its stage in C; the rest goes to round 8 |
| E. Display face for every stat numeral | — | +0.2 med → .16 | — | +0.3 med → .21 | .37 × 1.2 = 0.44 | M | 0.22 | round 8 |
| F. Help: one chapter at a time | +0.2 high → .26 | +0.3 med → .24 | (Don't bother: diagrams) | (Don't bother: microcopy) | .60 × 1.2 − .30 = 0.30 | M | 0.15 | defer |
| K. History/Profile stat cards as trophy plaques | — | — | +0.1 high → .10 | — | 0.10 | M | 0.05 | skip |
| L. Duels incoming row as a fight ticket | — | — | +0.1 med → .07 | — | 0.07 | S | 0.07 | skip |
| J. Login backdrop | — | +0.15 low → .07 | +0.1 med → .07 | +0.2 low → .08 | .22 × 1.4 − .20 (Sol: don't bother) = 0.11 | M | 0.06 | skip |
| H. Live round floor dressing / HUD rig | +0.1 high → .13 | +0.2 med → .16 | Don't bother | +0.2 med → .14 | Sol and Gemini say don't bother | — | — | **VETO** |
| I. Results reward hierarchy | +0.2 med → .18 | Don't bother | — | Protect | — | — | — | **VETO** |

**Don't bother (2+ judges agree):**
- More glow and gold brackets (Sol, Opus).
- Results polish (Opus, plus Qwen's protect).
- More stadium detail during play (Sol, Gemini).
- Settings decoration (Opus, Qwen).
- More shop items or rarity colours (Sol, Qwen).

**Protect:**
- Arena court, truss and scoreboard (all four judges).
- Results sunburst slab (Opus, Qwen).
- Armory rig and its visible trade-offs (Sol, Gemini, Opus).
- History tickets (Sol, Gemini).
- Profile competitor card (Sol, Gemini).
- Shop item card art (Gemini, Qwen).
- Duels VS split (Opus).

**Predicted (estimate sum × 0.3):**

| Judge | Contributing items | Gain | Score |
|---|---|---|---|
| Sol | A .3, C .15, D .2 | ≈ +0.2 | 8.2 |
| Opus | A .5, C .3 | ≈ +0.25 | 8.05 |
| Gemini | C .2, D .2, A .1, G .1 | ≈ +0.2 | 8.5 |
| Qwen | B1 .4, G .2, C .1 | ≈ +0.2 | 8.4 |

Run 2 now captures 13 screens (adds `13-rankup`). The baseline judges did not see it.
