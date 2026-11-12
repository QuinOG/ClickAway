# Round 39 changes (i38 → i39): 8px spacing round 1

Spacing rounds now follow Material Design's spacing methods as a guideline: component padding and gaps on an 8px grid (4px inside components), gaps that express grouping, shared keylines and consistent container widths. A DOM audit (`tests/e2e/zz-spacing-audit.spec.js`) measured each page's gaps, paddings, near-miss edges and touch targets to find the problems. The blind spacing check passed for shop (+0.5), profile (+0.4) and help (+0.3 on re-check). Screens 04, 05 and 09 changed; every other file in i39 is a byte-for-byte copy of i38.

## A. Profile (05)
- **Competitor card rhythm:** child gaps of 20/30/10/14/10/10/14px become 24/32/8/16/8/16/16. Identity items sit 8 apart, groups 16 apart, and the name clears the rank badge by 32. Side padding goes from 18 to 24.
- **One centre line:** the "Gold contender" ribbon now sits centred under the name instead of off to the left.

## B. Shop (04)
- **Same width as Profile and Duels:** the frame is 1140px instead of 1120px, so it no longer jumps when switching tabs.
- **One card rhythm:** card padding goes from 12 to 16, name→description from 4 to 8, and grid gutters from 14 to 16. Unlock/Equip buttons now sit on the text's left keyline.
- **Even sections:** the gap between sections goes from 22 to 32, and heading→description from 6 to 8.

## C. Help (09)
- **8px page rhythm:** page padding goes from 34 to 32 and chapter gaps from 34 to 32. Chapter padding becomes 8/32/32/64 (was 6/30/34/62).
- **Even chapters:** header → content is 16, blocks are 24 apart, subhead → content is 8, and the Full rulebook bar sits 24 below.

## Not shipped
- **Play lobby 8px rhythm (02):** it lost twice: by 0.8 (Start pressed against the panel bottom), then by 1.0 after the fix (cards cramped against the panel's right edge). 02 is a byte-for-byte copy of i38.
