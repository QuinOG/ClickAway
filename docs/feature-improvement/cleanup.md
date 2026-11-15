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

Kept, unsure: public/art/icons/crest.png (superseded by rank-specific crests, but retained conservatively); public/ranks/* (still referenced before rank migration); legacy root skin PNG/AVIF files (outside generated-art replacement scope).
Old SVG drawing components were already removed in 57bc0bc/b9fe204; current art components remain in use.
