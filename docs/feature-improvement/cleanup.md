# Cleanup evidence

History: 02e7692 added generated mounts; 2fbab74 replaced them with v2 medals; b9fe204 replaced v2 medals with v3. The live CSS uses only v3.

For each file below, a tracked-text scan and hidden-file rg search found zero references (including CSS, tests, scripts and docs). No dynamic mount/v2 path construction exists.

- Deleted `public/art/achievements/bronze-medal-v2.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/diamond-medal-v2.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/diamond-mount.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/gold-medal-v2.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/gold-mount.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/master-medal-v2.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/master-mount.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/platinum-medal-v2.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/platinum-mount.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/silver-medal-v2.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.
- Deleted `public/art/achievements/silver-mount.png`: no references; superseded by the corresponding v3 medal in src/styles/components/achievements.css.

Kept, unsure: public/art/icons/crest.png; public/ranks/bronze.png; public/ranks/silver.png; public/ranks/gold.png; public/ranks/platinum.svg; public/ranks/diamond.svg; public/ranks/deadeye.svg. The legacy rank files were live at the deletion audit and were retained during the subsequent rank migration. Legacy root skin PNG/AVIF files are outside this art replacement scope.
Old SVG drawing components were already removed in 57bc0bc/b9fe204; current art components remain in use.

## Rank migration

The shared getRankImageSrc helper now maps all six ranked tiers to public/art/ranks PNGs. CrestIcon uses the helper, with the existing generated unranked image as its fallback. TierBadge, Ladder podium/rows/hover cards, competitor pass, Profile, ranked Lobby, Help tiers and promotion ladder/ceremony use that map. Results receives projectedRankProgress from GameOverFlow and selects the corresponding crest instead of always showing Gold. Decorative images retain empty alt text next to rank text and fixed dimensions.

Deadeye: generated with the built-in image_gen tool using Diamond and Platinum as references. Output normalized to the set's 384x384 RGBA PNG delivery size, preserving transparency. Saved at public/art/ranks/deadeye.png.

Generation prompt: "Use case: stylized-concept. Create ONE Deadeye top rank emblem for this exact game emblem set. References are style and composition references. Match their crisp cartoon vector-like raster shading, thick near-black outlines, lime green laurel on both sides, two lower ribbon tails, symmetric front-facing shield, central faceted five point star, transparent background, square canvas and identical padding/framing. Deadeye is the most prestigious tier above diamond: rich violet and magenta faceted shield with luminous pale gold star, pale gold metal border and small crown atop, preserve the set's restrained silhouette and proportions. No text, no watermark. PNG with actual alpha, same square size as references (364x364). Save the generated output locally and report its path." (Inspection established the reference delivery dimensions as 384x384; the output was normalized accordingly.)

Screenshots: docs/feature-improvement/shots/cleanup contains before/after Help disclosures, Help tiers, Ladder and competitor pass at 1280x800 and 360x800. Baselines were captured by temporarily restoring the original source, then restoring implementation source. Playwright uses PLAYWRIGHT_PORT=4187 to avoid the main checkout's existing 4173 server.

Additional row screenshots use the same Playwright fixtures and reproduce the original helper's asset mapping via browser response interception for the before image; all other before captures use restored original source. The Help rank grid now adapts to available width instead of forcing six overlapping columns on phones.

Validation: lint passed; unit tests 215/215 passed; Vitest 43 files and 285 tests passed using --pool=threads --maxWorkers=1 (the initial default fork run was stopped after failing to report progress); production build passed. Focused cleanup browser checks passed at 1280x800 and 360x800, asserting native disclosure expansion, no page overflow, readable card widths and loaded PNG images. Refreshed only desktop-1440-help.png and mobile-320-help.png; the focused six-snapshot run passed.

The manual device sweep was limited to phone-small (360x740) and laptop-small (1280x800), and Help/Ladder/Profile: 2/2 passed. No sideways overflow, overlaps, unreachable actions or small touch targets were reported. Its heuristic flagged seven clipping cases on phone (branding and Profile text/tabs outside this change); desktop had none. The two-hour whole-app manual sweep was stopped; the complete assertion-based browser suite is reported separately below.

Final assertion-based browser suite: 156/156 passed after the two intended Help snapshot updates. This covers all seven assertion spec files in tests/e2e, including the new cleanup checks; optional zz capture/audit tools were handled separately as described above. No tests were deleted or weakened, no dependencies were added, and nothing was pushed.
