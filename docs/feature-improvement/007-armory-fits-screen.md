# Fix 007: the Armory fits every screen

## In plain terms

- **Problem:** On anything narrower than a big desktop screen, the Armory broke. On phones and tablets every panel was squeezed into a strip about 210px wide, and the **Install** button was cut off by its own card. On 1024-1180px laptops the right-hand panel ran off the edge of the screen. On 1280-1366px laptops the machine picture was cut off.
- **Solution:** The wide three-column layout now only applies where it fits. On 1280-1399px laptops the machine picture is scaled down slightly so nothing is cut off. Between 941 and 1259px, the parts list stays on the left and the machine sits above the part details. Tablets and phones get the single stacked column the Armory was already designed to use, with the part housings listed under the machine.

## Evidence

Type: real breakage, measured, not a new feature. The cause: `game-armory.css` loads after `armory.css` and set a fixed `210px 420px 560px` grid (1190px minimum) with no width condition. That overrode `armory.css`'s own 1100px and 940px layouts. In the same way, the floating-housing rules out-ranked `armory.css`'s phone layout for the housings.

- Before: `tests/e2e/armory-fits-screen.spec.js` failed at 7 of 9 widths (320-1180). The release-matrix laptop check had flagged clipped Armory actions.
- After: it passes at all 11 widths (320, 390, 768, 900, 1024, 1100, 1180, 1259, 1280, 1366, 1440). A sweep for cut-off buttons and text found nothing at any width from 320 to 1920 (except a collapsed step title, which is also reported at 1920, where nothing changed). There is no sideways scrolling at any width.
- Wide desktop (1400px and up) is unchanged.

Screenshots: `shots/007/before-armory-*` and `after-armory-*` (desktop 1440, laptop 1024, mobile 390, plus `*-1366-laptop`).

Not reviewed independently. Builder measurements only.
