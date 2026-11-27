# Plan 021: New screenshot captures stop bloating the git repo

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- .gitignore .gitattributes docs/ui-polish/README.md`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (nothing is deleted)
- **Depends on**: 002
- **Category**: dx
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

At `1a307d9`, `docs/` is 1.4 GB on disk with 2,107 tracked PNGs, and `.git` is
1 GB (668 MiB packed). Every clone and every agent worktree pays for this, and
each RSI or polish round adds hundreds of full-page captures. Rewriting history
or deleting the existing images is the owner's decision. This plan does
**neither**. It stops growth and documents the cleanup options.

## Design

1. Measure. Use `git count-objects -vH`, `du -sh docs`, and the largest
   directories:
   `git ls-files docs | awk -F/ '{print $1"/"$2"/"$3}' | sort | uniq -c | sort -rn | head -15`,
   then `du -sh` each one. Put the numbers in a new section of
   `docs/ui-polish/README.md` (create the file if missing).
2. Find where the capture scripts and skills write raw captures. Look at the
   `SHOT_DIR` usages in `.claude/skills/clickaway-rsi/SKILL.md` and
   `tests/e2e/zz-*.spec.js`. Raw full-page captures (the rounds' `iN/`
   folders) are working files. The curated before and after close-ups are the
   record (see `docs/ui-polish/unslop`).
3. Add `.gitignore` rules for raw capture folders **only for new rounds**, so
   nothing already tracked is affected. Tracked files stay tracked even when
   ignored. Example: `docs/ui-polish/**/raw/`. Change no skill. Instead,
   document in `docs/ui-polish/README.md` that new raw captures should go to a
   `raw/` subfolder (ignored), and only curated crops get committed.
4. Write the cleanup options for the owner in the same README section, without running any:
   - (a) `git rm --cached` old raw round folders, which stops tracking them but keeps history
   - (b) `git filter-repo --path-glob 'docs/ui-polish/*/i*/*.png' --invert-paths`, which rewrites history, needs a force push and re-clones, and is irreversible for others
   - (c) Git LFS for future images

   Give rough size savings for each from step 1.

## Scope

**In scope**: `.gitignore`, `docs/ui-polish/README.md`.
**Out of scope**: deleting, moving or untracking any file. Editing skills. Any history rewrite.

## Steps

1. Measure and write the section. **Verify**: the section has the numbers.
2. Add the `.gitignore` rule. **Verify**: `git status --porcelain` shows only the two in-scope files, and `git ls-files docs | wc -l` is unchanged from before (record both).

## Done criteria

- [ ] `git ls-files | wc -l` is unchanged
- [ ] The README section lists the sizes and cleanup options
- [ ] Committed on `advisor/021-stop-screenshot-repo-growth`

## STOP conditions

- An ignore rule would match an already-tracked folder the skills write to every round. That is confusing: files stay tracked but new ones are ignored. Report which folder.
