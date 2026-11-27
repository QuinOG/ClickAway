# UI polish screenshots

This folder holds visual polish captures, review briefs, and curated before/after comparisons for ClickAway.

## Repository size baseline

Measured at commit `768d925` (after merging `improve/integration` over `1a307d9`):

- `docs/` on disk: **1.34 GiB** (1,376.5 MiB) across **2,220** tracked files (**1,936** tracked PNGs totaling 1,367.1 MiB, plus 77 JPEGs and markdown/JSON notes; 2,107 tracked PNGs repo-wide)
- `.git` directory on disk: **0.99 GiB** (1,016 MiB)
- `git count-objects -vH`: 5,514 loose objects (339.48 MiB), 8,545 packed objects in 17 packs (667.57 MiB), 754 prune-packable

Largest `docs/` directories by tracked file count (grouped at `docs/<area>/<subdir>`):

| Tracked files | Disk size | Directory |
|---:|---:|---|
| 1,362 | 1,011.2 MiB | `docs/ui-polish/game-feel` |
| 341 | 99.8 MiB | `docs/feature-improvement/shots` |
| 45 | 25.7 MiB | `docs/ui-polish/shop` |
| 30 | 15.1 MiB | `docs/ui-polish/profile` |
| 28 | 13.4 MiB | `docs/ui-polish/g2` |
| 27 | 13.3 MiB | `docs/ui-polish/g1` |
| 13 | 3.0 MiB | `docs/ui-polish/unslop` |
| 13 | 5.4 MiB | `docs/ui-polish/g3` |
| 12 | 5.2 MiB | `docs/ui-polish/g5` |
| 12 | 5.1 MiB | `docs/ui-polish/g4` |
| 10 | 4.4 MiB | `docs/ui-polish/d2` |
| 10 | 4.5 MiB | `docs/ui-polish/d4` |
| 10 | 5.1 MiB | `docs/ui-polish/c0` |
| 10 | 4.4 MiB | `docs/ui-polish/d1` |
| 10 | 4.4 MiB | `docs/ui-polish/d3` |

Inside `docs/ui-polish/game-feel`, the 58 `iN/` raw round folders account for **1,064** tracked PNGs (**904.7 MiB**, about 16.1 to 16.6 MiB per recent 20-shot round), and `steps/` accounts for 139 tracked files (99.1 MiB). By contrast, the curated before/after close-ups in `docs/ui-polish/unslop/` take 13 files and 3.0 MiB.

## Capture workflow for new rounds

Capture scripts write raw screenshots using `SHOT_DIR` or `OUT`:

- `.claude/skills/clickaway-rsi/SKILL.md` runs `SHOT_DIR=docs/ui-polish/game-feel/iN npm run test:capture -- tests/e2e/zz-app.spec.js --workers=1`.
- `tests/e2e/zz-app.spec.js` defaults `SHOT_DIR` to `docs/ui-polish/game-feel/tmp`.
- `tests/e2e/zz-capture.spec.js` defaults `SHOT_DIR` to `../ui-shots/tmp`.
- `tests/e2e/zz-feature-shot.spec.js` defaults `OUT` to `test-results/feature-shot/${ROUTE}` (examples point to `docs/feature-improvement/shots/...`).

Raw full-page captures (`iN/` round folders) are working files. Curated before/after close-ups (like `docs/ui-polish/unslop/`) are the permanent record.

For new rounds, write raw captures into an ignored `raw/` subfolder instead of committing full-page dumps:

- `.gitignore` ignores `docs/ui-polish/**/raw/` and `docs/feature-improvement/shots/**/raw/`.
- Example: `SHOT_DIR=docs/ui-polish/game-feel/raw/i52 npm run test:capture -- tests/e2e/zz-app.spec.js --workers=1`.
- Commit only curated before/after crops and decision notes.
- Existing tracked folders remain tracked and untouched.

## Cleanup options for existing captures

None of the options below have been executed. They are listed for the repository owner to decide later.

### Option (a): Untrack old raw round folders with `git rm --cached`

```sh
git rm --cached 'docs/ui-polish/*/i*/*.png'
```

- **What it does:** Removes the 1,064 raw round PNGs from the index going forward while keeping git history unchanged. No force push is required.
- **Rough size savings:** About **905 MiB** saved per working tree and agent worktree checkout. **0 MiB** saved in `.git` history (existing packfiles stay ~668 MiB).

### Option (b): Rewrite history with `git filter-repo`

```sh
git filter-repo --path-glob 'docs/ui-polish/*/i*/*.png' --invert-paths
```

- **What it does:** Strips those 1,064 raw round PNGs from every commit in repository history. Requires a force push, forces all clones and worktrees to be re-cloned or reset, and is irreversible for collaborators.
- **Rough size savings:** About **905 MiB** saved per working tree checkout, plus a large reduction in `.git` pack size (roughly **400 to 600 MiB** off the 667.57 MiB packed objects, depending on blob deduplication from `reuse_unchanged.py`).

### Option (c): Use Git LFS for future images

```sh
git lfs track "docs/**/*.png"
```

- **What it does:** Stores future committed PNGs as Git LFS pointer files in `.gitattributes` instead of adding binary blobs to normal git packs. Requires `git-lfs` for contributors and uses LFS storage and bandwidth quotas.
- **Rough size savings:** **0 MiB** on existing history unless paired with a history migration (`git lfs migrate import`), and prevents future `.git` pack growth from committed screenshots (keeping new rounds near 0 MiB in git history when combined with ignored `raw/` folders).
