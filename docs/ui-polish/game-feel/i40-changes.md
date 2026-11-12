# Round 40 changes (i39 → i40): 8px spacing round 2

Judged on spacing only, against the Material-style spacing guide. The blind check passed for ladder (+0.9), duels (+0.3) and history (+0.9). Screens 06, 07, 08 and 15 changed; every other file in i40 is a byte-for-byte copy of i39.

## A. Ladder (06, 15)
- **Even plates:** the gaps between ladder rows were 10/10/16/16; every row is now 16 apart, including around the highlighted "You are here" row. Plate internals use 16 throughout.
- **Shared keylines:** the podium panel and the standing card share top and bottom edges and use 24 vertical padding. The standing card's sides are 16 so its stats ("None yet") still fit.
- **8px panels:** season banner padding goes from 14/20 to 16/24, control rail padding from 10/12 to 16, and there are 24 between banner, top row, controls and list.
- **Hover card (15):** the card itself is unchanged, but the blind check preferred i39 by 0.5 only because the taller page pushes the last ladder row out of the fixed-size viewport capture. It ships with the ladder change because it can't be separated from it.

## B. History (08)
- **Highlight card rhythm:** the gaps inside each card were 8/6/2/10; they are now 8/8/8/16. The cards are 16 apart (was 10) with 16 vertical padding.
- **Sections:** 32 between chart row, Full log, Load older and the summary bar (was 10). The log grid has equal 16 gutters, and every round card has 16 padding.
- **Keylines:** the chart and Highlights share a top edge; the chart and Full log share a left edge.

## C. Duels (07)
- **Section rhythm:** header → inbox goes from 14 to 16, and inbox → composer from 22 to 24.
- **One edge:** the run tokens and launch step stuck out 4px past the fight card on each side; they now share its edges. The hint sits 8 below the launch step.
- **Challenge card padding:** 12/18 becomes 16/24.
