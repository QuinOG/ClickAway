# Round 46 changes (i45 → i46): layout and redundancy round 8

Judged on layout, spacing and redundancy only. The blind check passed for Armory compare (+0.3), spec sheet (+0.6) and the mobile More menu (+0.7). Screens 16, 18 and 20 changed; every other file in i46 is a byte-for-byte copy of i45.

## A. Armory spec sheet (18)
- **One section style:** "Performance profile" was boxed and indented 7px; it is now a bare heading on the same left edge as Strengths & tradeoffs, Powerup timing and Field record, with 8px to its dials.
- **No repeated mode:** the assembly caption reads "Assembly" instead of "Assembly / Casual"; the header already says "Spec sheet · Casual".
- **Kept:** the four Field record tiles stay at their natural widths; equal 96px tiles would cut off "BEST STREAK".

## B. Armory compare (16)
- **Full bottom padding:** the content was 13px taller than the modal allowed, leaving 5px under the summary cards. The modal now starts 12px higher (top 96) and keeps its 18px padding on all sides.

## C. Mobile More menu (20)
- **Shared lines per row:** Shop's awning padding and Duels' banner padding put their icons 12px apart; both tiles now use the same padding, so icons and labels share a line. History's clock gets the same height as Help's icon, so that row's labels line up too.
