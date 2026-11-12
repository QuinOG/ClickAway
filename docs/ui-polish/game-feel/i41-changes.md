# Round 41 changes (i40 → i41): 8px spacing round 3

Judged on spacing only, against the Material-style spacing guide. The blind check passed for results (+0.7). Screen 12 changed; every other file in i41 is a byte-for-byte copy of i40.

## A. Results (12)
- **One left keyline:** the score panel was indented 23px from the reward tiles and level bar below it (x=62 vs x=39); it now spans the full column, so the three blocks share one left and right edge.
- **Shared column edges:** the left and right columns start and end on the same lines (top y=140, bottom y=655), with a 24px gutter between them (was 19).
- **Even rhythm:** card padding is 24 (was 25.2). Block gaps are 16 in both columns (were 10, 12 and 20) and 8 between reward tiles (was 10). Reward tiles are padded 8/12 and strips 8/16; Play Again and Change Mode are 16 apart (was 12).

## Not shipped
- **Armory 8px rhythm (03):** rail, stage, instrument and picker padding on the grid, without adding height. The blind check called it "same" (no visible spacing gain). 03 is a byte-for-byte copy of i40.
- **Armory 8px rhythm (Terra build):** stopped before commit because the module picker spilled below its panel.
