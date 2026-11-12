# Round 9 decisions (run 2, round 3)

## Calibration of round 8
| Judge | i7 | Predicted | Actual i8 | Gain |
|---|---|---|---|---|
| Sol | 8.0 | 8.15 | 8.1 | +0.1 |
| Opus 5 (low) | 8.1 | 8.4 | 8.2 | +0.1 |
| Gemini 4 Argon | 8.7 | 8.95 | 8.8 | +0.1 |
| Qwen3.8 Max | 8.5 | 9.0 | 8.5 | 0 |

Every judge moved about +0.1, even though the round touched seven screens. The ×0.5 factor over-predicted. Use ×0.25 for everyone.

The judges all named the same remaining problem: what sits below the fold. Opus put it as "a game with a dashboard attached to the bottom of four screens." Two of my change notes overclaimed:
- The Help ruled lines were invisible.
- The legendary "gold shelf" was a full-row bar.

## Weights
| Judge | Gap below bar | Weight |
|---|---|---|
| Sol | 1.3 | ×1.3 |
| Opus | 0.8 | ×1.15 |
| Qwen | 0.5 | ×1.0 |
| Gemini | 0.2 | ×1.0 |

## Picks
| Cluster | Sol | Opus | Gemini | Qwen | Decision |
|---|---|---|---|---|---|
| **R. History LED bars overflow the bezel (Sol); the legendary shelf claim was wrong (Gemini)** | regression | — | regression | — | **FIX** |
| **A. Shop item grid as physical products** | +0.3 high (#1) | +0.4 high (#1) | +0.1 high | +0.2 med | **PICK**: all four judges, the highest value this round |
| **B. Help pages on a paper ground with printed type** | +0.2 high | +0.3 high | — | +0.2 low | **PICK** |
| **C. Login as a stadium entry with a competitor pass** | +0.2 med | Don't bother | +0.2 high | +0.3 med | **PICK** (net positive: three for, one against) |
| **D. Duels incoming challenge as a fight ticket** | +0.1 med | +0.15 med | +0.2 high (#1) | — | **PICK** (Gemini #1) |
| **E. Profile achievements as a lit trophy path** | +0.1 high | +0.25 med | +0.1 med (attributes) | — | **PICK** |
| **F. History side column as a placard, with mode tokens** | — | +0.15 med | — | +0.2 med | **PICK** (cheap) |
| G. Ladder below the podium as a standings board | — | +0.3 med | — | Don't bother (rows) | round 10 |
| H. Settings control cabinet | Don't bother | Don't bother | +0.1 med | +0.3 med (#1) | **VETO** (two don't-bothers). Qwen's #1 is vetoed, so its next pick, Login, is taken instead. |
| I. Podium bodies | +0.2 med | — | — | Don't bother | round 10 |

**Don't bother:**
- More rank-up effects.
- Results.
- More bevels or rivets.
- A typeface swap (Qwen).
- Nav tweaks.

**Predicted (×0.25):**

| Judge | Contributing estimates | Score |
|---|---|---|
| Sol | A .3, B .2, C .2, D .1, E .1 | +0.2 → 8.3 |
| Opus | A .4, B .3, E .25, F .15, D .15 | +0.3 → 8.5 |
| Gemini | D .2, C .2, A .1, E .1 | +0.15 → 8.95 |
| Qwen | C .3, A .2, B .2, F .2 | +0.2 → 8.7 |
