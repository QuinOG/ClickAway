# Round 45 changes (i44 → i45): layout and redundancy round 7

Judged on layout, spacing and redundancy only. The blind check passed for shop (+0.5) and help (+0.6). Screens 04 and 09 changed; every other file in i45 is a byte-for-byte copy of i44.

## A. Shop (04)
- **No repeated tagline:** the hero no longer repeats the item's tagline ("RGB but make it locked in."), which its card shows just below. The title and the Button/Arena/Profile list sit as one group, 16px apart.
- **Selected card stays in its row:** the selected card was lifted 3px above its row, so its name and button were off the neighbours' lines. It now sits level and lifts only on hover.

## B. Help (09)
- **Power keys on one top line:** in each row of the power-key grid, entries were centred vertically, so titles started at different heights (Grow +10 sat about 10px above Time +2s). Each icon and title now start on the same line.
- **FAQ answers under their questions:** single-line answers were stretched to the card's middle; every answer now sits 8px under its question.

## Not shipped
- **Results gaps:** deferred; the remaining fixes need measuring inside a live round, and Results had its spacing pass in round 41.
