# Fix 008: the History score chart is readable on phones and tablets

## In plain terms

- **Problem:** On anything narrower than 1100px, the History score chart was squashed. Its plot area was 0px tall, so the three axis numbers were printed on top of each other and the bars were flattened. The title, the "+282" change badge and the Practice / Casual / Ranked chips were all drawn in the same corner: on phones the chips covered the title, the badge ran off the edge of the chart, and at 768px the badge overlapped the Practice chip.
- **Solution:** Below 1100px, the chart stacks its parts: the title and change on top, then the mode chips (the same original chips), then the plot, which now has real height. The axis labels line up with the bars. Desktop is unchanged.

## Evidence

Type: real breakage, measured, not a new feature. Cause: `game-feel.css` sets the plot to `height: 100%` with 142px top and 30px bottom padding. That only works when the chart is stretched to the height of the Highlights column (the 1100px+ two-column layout). Below that the chart has no height, so the plot collapsed to just its padding.

- Before: `tests/e2e/history-chart-fits.spec.js` failed at 320, 390, 768 and 1024, and passed at 1440.
- After: it passes at all 5 widths. Measured: no overlaps and nothing outside the chart at 320-1099. Each axis label sits 8px from the top of its bar, the same as on desktop. At 1100px and up the chart is unchanged.

Screenshots: `shots/008/before-history-*` and `after-history-*` (desktop 1440, tablet 768, mobile 390).

Not reviewed independently. Builder measurements only.
