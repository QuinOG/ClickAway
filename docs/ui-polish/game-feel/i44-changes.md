# Round 44 changes (i43 → i44): layout and redundancy round 6

Judged on layout, spacing and redundancy only. The blind check passed for login (+0.6), ladder (+0.5), settings (+0.7), ladder hovercard (+0.5) and sign-up (+0.9). Screens 01, 06, 10, 15 and 19 changed; every other file in i44 is a byte-for-byte copy of i43.

## A. Ladder (06, 15)
- **"You" row on the shared columns:** the current player's row had a -10px side margin, so it was 20px wider than the others and its rank shield, avatar, stats and rating box sat 10px off their columns. It now uses the same edges as every other row. The hovercard shot changed only because this row is in view.

## B. Settings (10)
- **Status in the footer row:** "Preferences are saved." no longer takes its own ruled band. It sits inline after "Reset defaults", and the dialog is shorter.
- **One button height:** Reset defaults, Close and Apply are all 48px tall (were 42 and 47).

## C. Login and sign-up (01, 19)
- **Centred pass:** the avatar and title on the competitor pass are centred vertically, with even space above and below (64px on login), instead of leaving 95px (login) or 180px (sign-up) empty at the bottom.
- **No repeated season tag:** the header's "Admit one · Season 1" is gone; the S1 seal and the pass text already show it.
