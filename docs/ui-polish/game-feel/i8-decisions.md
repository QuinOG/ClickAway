# Round 8 decisions (run 2, round 2)

## Calibration of round 7
| Judge | i6 | Predicted | Actual i7 | Gain |
|---|---|---|---|---|
| Sol | 8.0 | 8.2 | 8.0 | 0 |
| Opus 5 (low) | 7.8 | 8.05 | 8.1 | +0.3 |
| Gemini 4 Argon | 8.3 | 8.5 | 8.7 | +0.4 |
| Qwen3.8 Max | 8.2 | 8.4 | 8.5 | +0.3 |

The ×0.3 realism factor under-predicted the three newer judges this round (actual gains were about ×0.4–0.6 of their estimates). Sol stayed flat, as it did in run 1 after large structural rounds. Keep ×0.3 for Sol and use ×0.5 for the others.

**Overclaim check.** Opus said the Shop item renders at about 125px and the standing stats are white. Measured in the 1440px capture, the item is about 170px and the standing numerals are gold, so those two readings were scale errors. Two claims did overstate, and both judges were right:
- The standing stats are one recessed box but still laid out 3×2, not a single bar.
- The Shop stage is about half the hero width, not more.

Change notes must state measured values only.

## Weights
Weights are by gap below each judge's stop bar:

| Judge | Score | Bar | Gap | Weight |
|---|---|---|---|---|
| Sol | 8.0 | 9.4 | 1.4 | ×1.3 |
| Opus | 8.1 | 9.0 | 0.9 | ×1.15 |
| Qwen | 8.5 | 9.0 | 0.5 | ×1.0 |
| Gemini | 8.7 | 9.0 | 0.3 | ×1.0 |

## Decisions

| Cluster | Sol | Opus | Gemini | Qwen | Value | Cost | Decision |
|---|---|---|---|---|---|---|---|
| **R. Armory: the rail's taller gauges push Bastion and Flashpoint out of view** | regression | regression | regression | — | must fix | S | **FIX FIRST** |
| **A. Rank-up: tier medal and ceremony frame** | +0.1 high | (at reference) | +0.2 high (#1) | Don't bother | .33 × 1.2 − .15 = 0.25 | M | **PICK** (Gemini #1). A real medal, not more confetti. |
| **B. Shop: brighter stadium behind the stage, a pedestal with real thickness, a booth counter and awning** | +0.3 high (#1, booth) | (+0.3 high #1: item grid) | Don't bother | +0.3 med | .39 + .21 = .60 × 1.2 − .15 = 0.57 | M | **PICK** (Sol #1). Opus #1 partly: legendary cards tilt and sit on a raised gold shelf. Card art and frames are unchanged (Gemini and Qwen protect them). |
| **C. History: trajectory chart as a broadcast scoreboard** | — | +0.15 med | +0.1 med | +0.2 low | .27 × 1.4 = 0.38 | M | **PICK** (three judges) |
| **D. Play lobby: mode cards as physical plaques in a dispatch console** | — | — | +0.2 high | +0.2 med | .34 × 1.2 = 0.41 | M | **PICK** |
| **E. Help as a field manual: paper pages, codex tabs, display numerals** | — | +0.25 med | — | +0.4 med (#1) | .48 × 1.2 = 0.58 | L | **PICK** (Qwen #1), scoped to page material and tabs |
| **F. Ladder podium depth: side faces, shared floor, players standing on the blocks** | +0.1 med | (protect) | Don't bother | +0.3 med | .30 × 1.2 − .15 = 0.21 | S | **PICK** (cheap; keeps the protected silhouette) |
| G. Second typeface; no 10px tracked capitals | — | +0.25 med | — | — | 0.29 | M | round 9 |
| H. Login arena-entrance scene | +0.2 high | — | — | — | 0.26 | M | round 9 |
| I. Profile trophy path and attribute plot | +0.2 med | +0.2 med | Don't bother | — | 0.26 | M | round 9 |
| J. Armory left rail as a rack, stepper as switches | +0.2 high (right rail) | — | +0.1 med | — | 0.40 | M | round 9 |
| K. Duels outer frame and incoming ticket | — | +0.1 low | +0.1 high | — | 0.18 | S | round 9 |
| L. Settings hardware | — | Don't bother | — | +0.2 low | — | — | skip |

**Don't bother (2+ judges):**
- More rivets and gold outlines (Sol, Opus).
- Login input polish (Sol, Opus, Qwen).
- Reworking Shop item art (Sol, Qwen).
- More Results confetti or glow (Sol, Opus).

**Protect:**
- Arena court, truss and scoreboard.
- Results.
- Armory rig and swap numbers.
- History tickets.
- Duels VS split.
- Shop item card art.
- The Ladder podium silhouette and spotlight.
- The nav bar.

**Predicted:**

| Judge | Contributing estimates | Factor | Gain | Score |
|---|---|---|---|---|
| Sol | B .3 + A .1 + F .1 | ×0.3 | ≈ +0.15 | 8.15 |
| Opus | B .3 (partly) + E .25 + C .15 | ×0.5 | ≈ +0.3 | 8.4 |
| Gemini | A .2 + D .2 + C .1 | ×0.5 | ≈ +0.25 | 8.95 |
| Qwen | E .4 + F .3 + B .3 + D .2 + C .2 | ×0.5 | ≈ +0.5 | 9.0 |
