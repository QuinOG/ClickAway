# Consolidated art rework inventory

This pass audits the remaining source against the current 20-screen capture set. It continues the existing portrait, rank crest, stadium, achievement and shop-pedestal rework.

## Replaced or reused

- Armory build identity artwork: control, pressure, utility and balanced now use the accepted illustrated target, bolt, rig and crest assets. Removed unused legacy module/power SVG implementations; active module and power glyphs already use images.
- Help: 13 static teaching scenes use existing generated illustrations. Countdown, hit score, combo, streak reset and progression cues remain real HTML. Constrained illustrations to their scene slots and made labels readable on the guide's paper background.
- Identity pass: the central hand-drawn star becomes the existing illustrated target. Curved seal text remains typography.
- Ladder: generated plinth art replaces the podium faces beneath live rank labels.
- Results: generated gold/silver/bronze performance medals retain the original clean-run and accuracy conditions.
- Promotion: generated division frame and mirrored cannon sprites retain division-dependent decoration and live confetti.
- Duel woodwork and Shop booth: generated platform and booth scenery sit around the live controls and preview; see the scenery inventory for prompts.
- Gameplay: a non-interactive 15% black shade dims the visible stadium during aiming. Targets, feedback, countdown and HUD remain above it. Verified the target is hit-testable and a click scores.

## Already illustrated

- Play target stand, Compare hub targets, Results unlock rig, Armory part/power imagery, navigation icons, history medals, portraits, rank crests, stadium plate and achievement mounts already use accepted raster assets. No duplicate generation is needed.

## Retained in code after inspection

- Profile attribute dials and Armory instruments: values, fills and comparison needles change with player data and the selected build.
- History climb chart: plotted geometry changes with the filtered round history.
- Armory spec-sheet assembly: its module positions and icons describe the selected machine. The current parts are already illustrated; replacing the assembly with one static picture would lose that relationship. The prior exploded assembly image had failed its review.
- Brand marks, pass engraving, curved seal lettering, ticket labels, stamps and numbers: typography or established branding.
- Tiny settings and navigation control symbols, focus rings, panel borders, dividers and progress tracks: functional UI chrome.
- Live target skins, hit feedback, countdowns, confetti, stadium lighting and theme tint: gameplay or animation layers.
- The old arena horizon is hidden by the painted stadium styles; generating a replacement for that hidden artwork would not change the interface.

All artwork changes share one Art rework section and one screenshot table in the PR description. Earlier screenshot tables in art follow-up comments are consolidated into links to that section.
