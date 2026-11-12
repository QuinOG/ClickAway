# ClickAway art brief (for image generation)

Static illustrations (medals, mounts, props, item supports, power pictures) are generated as raster images with the image tool, not drawn as SVG or CSS. Anything data-driven (gauges, bars, numbers, text) and anything animated stays in code.

## House style
- Chunky cartoon game art, the look of a polished mobile or indie arcade game.
- Thick dark ink outline around every shape (near #050912), slightly thinner on inner details.
- Light from the top-left. Flat base colours, one cel-shaded shadow crescent on the lower-right, one crisp highlight on the upper-left.
- Metals are slightly glossy: gold (#e2b04a with #fff1c0 highlights and #9a6a22 shade), steel (#7d8fa0 / #c9d6de / #34434f), copper (#b8692c / #ffcf8a).
- Accents: target red #c8402e / #e5484d, cream #f6e2a6, arena cyan #55d9ff, charge green #4fe3a6, neon purple #d65cff.
- No text, letters or numbers inside an image. No drop shadow baked under the object (the page adds one), unless the brief asks for a contact shadow.
- One object per image, centred, filling about 85% of the canvas.

## Reference screenshots (pass them to the image tool)
- `docs/ui-polish/game-feel/<latest round>/13-rankup.png` - rank crests and medals
- `docs/ui-polish/game-feel/<latest round>/05-profile.png` - achievement medals
- `docs/ui-polish/game-feel/<latest round>/04-shop.png` - item art
- `public/art/history/best-score-medal.png` - an accepted generated image (target style)

## Output
- PNG, transparent background (check the alpha channel), generated at 1024 or 512 square.
- The builder trims the transparent margin and saves at about 3x the display size (for example 256px for a 76px slot) in `public/art/<screen>/<name>.png`.
- A set (for example the nine power keys) must look like one family: same outline weight, same lighting, same finish. Generate the set in one session and compare them side by side before saving.
- **Family, not clones (user, 2026-11-12).** Members of a set must be instantly told apart at their smallest display size: give each its own object and silhouette, and carry the family through palette, outline and finish only. Never reuse one frame or housing with a swapped centre (the first Armory part batch did this and was rejected).
- **Give the image model creative freedom (user, 2026-11-12).** Describe what each item IS and DOES in the game, plus the constraints (size, empty areas, no text); let it invent the object rather than dictating every detail. Prescribe details only where code depends on them (a socket, an empty cloth centre).
- **Don't touch an output folder while Terra is still writing to it.** Compressing its files or moving its contact sheet mid-batch made Terra stop to avoid a conflict. Run `prep_art.py` only after the batch reports back, and have Terra write contact sheets to the scratchpad, not `public/`.
- Generate one image at a time and save each file immediately; a batch that queued 15 requests at once stalled and lost them all. Avoid running more than two image batches in parallel.
