# Round 10 decisions (run 2, round 4)

## Calibration of round 9
| Judge | i8 | Predicted | Actual i9 | Gain |
|---|---|---|---|---|
| Sol | 8.1 | 8.3 | 8.2 | +0.1 |
| Opus 5 (low) | 8.2 | 8.5 | 7.9 | −0.3 |
| Gemini 4 Argon | 8.8 | 8.95 | 8.8 | 0 |
| Qwen3.8 Max | 8.5 | 8.7 | 8.6 | +0.1 |

The average was 8.38, down from 8.40.

Opus dropped because several claims did not show at full resolution: the Shop materials, glare and flecks; the Duels stamp tilt; and the Help ruled lines. The clipped Login S1 stamp also read as a bug.

**Lesson:** subtle CSS effects (under about 15% opacity, or a few degrees of rotation) do not register. Only claim what a crop at 100% shows.

## Weights
| Judge | Gap below bar | Weight |
|---|---|---|
| Sol | 1.2 | ×1.3 |
| Opus | 1.1 | ×1.15 |
| Qwen | 0.4 | ×1.0 |
| Gemini | 0.2 | ×1.0 |

## Picks
| Cluster | Sol | Opus | Gemini | Qwen | Decision |
|---|---|---|---|---|---|
| **R. Login S1 stamp is clipped; Shop shows the price twice; progress bars remain under locked trophies** | regression | regression | regression | regression | **FIX** |
| **A. Settings as a hardware console** | +0.2 high | +0.4 high (#1) | +0.2 high (#1) | +0.3 med (#1) | **PICK**: all four judges. It was vetoed in r9; Sol and Opus now ask for it. |
| **B. Profile attributes as compact gauges, plus one scouting report** | +0.3 high | +0.3 high | +0.1 high | — | **PICK** |
| **C. Shop boxes with visible depth and glare, and a printed body** | +0.3 high (#1) | +0.25 med | +0.1 med | +0.2 med | **PICK** |
| **D. Duels ticket filled with printed details; the composer on a counter** | — | +0.2 med | +0.1 med | +0.2 med | **PICK** |
| **E. History highlights as plaques** | +0.2 med | — | +0.1 high | — | **PICK** |
| **F. Help: the contents page on paper; the plates mounted** | +0.1 med | +0.15 high | — | +0.2 med | **PICK** |
| G. Armory right column as a rig readout and parts tray | — | +0.3 med | — | +0.1 low | round 11 |
| H. Ladder signboard and controls | +0.2 med | — | — | — | round 11 |
| I. History scoreboard showing all 8 rounds | — | +0.15 med | — | — | skip: the mode filter is the design |

**Predicted (×0.25):**

| Judge | Contributing estimates | Score |
|---|---|---|
| Sol | C .3, B .3, A .2, E .2, F .1 | +0.25 → 8.45 |
| Opus | A .4, B .3, C .25, D .2, F .15, plus regressions fixed | +0.35 → 8.25 |
| Gemini | A .2, B .1, C .1, D .1, E .1 | +0.15 → 8.95 |
| Qwen | A .3, C .2, D .2, F .2 | +0.2 → 8.8 |
