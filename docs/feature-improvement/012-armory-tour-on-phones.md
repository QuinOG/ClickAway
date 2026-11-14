# 012: The Armory tour works on phones

## Player task
After their first round (see 009 and 011), a new player opens the Armory and follows the tour to set up their build.

Why it matters: the tour now comes right after the first round, at the moment the build starts to matter. On phones it couldn't be followed.

## Baseline (observed by Sol's review of 009)
At 390×844, step 2 "This is your machine" scrolled to the parts while the tour card (instructions, Keep Current Name / Save Name) sat at y≈1620, about 800px below the screen. The card was positioned against the bottom of the whole Armory page, which is about 2,000px tall on a phone, and the tour never scrolled to what it described (shots/012/before-step2.png).

## Intended outcome (pass/fail)
- At 390×844, every tour step's card and buttons are fully on screen above the bottom navigation, and the step's target is scrolled into view.
- Desktop (1440×900) positions unchanged.

Excluded: tour content and step order. Repair limit: two.

## Result
- `armory.css`: at ≤820px the tour card is fixed just above the bottom navigation (max 46% of the screen, scrolls if longer).
- `useArmoryWalkthrough.js`: on narrow screens each step scrolls its target to the top.
- Measured at 390×844, all five steps: card between y 486 and 766, every button inside it; the bottom navigation starts at 778. At 1440×900 the measurements match the pre-change ones (e.g. Keep Current Name at 803–863).
- The card can cover the lower part of a tall target (step 4's powerup grid); the player can scroll it while the card stays put.
- Checks: lint, Armory UI tests. Shots: shots/012/before-step2.png, after-step2.png, after-step4.png.
