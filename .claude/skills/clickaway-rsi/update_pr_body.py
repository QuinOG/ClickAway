"""Rewrite the ClickawayRSI PR description as a live summary.

usage: python update_pr_body.py <latest round N> <scores.json> [baseline round B, default 0] > body.json
(the baseline is the round the PR started from; the score table and the comparison start there)
scores.json: {"i0": [sol, terra, opus, gemini, qwen], ...} (shorter lists are padded); use null for a judge who sat a round out
(Terra is null from i6 on).

Produces {"body": ...} with: the process blurb, the full score table, and a
single baseline vs latest table for the screens this run changed, so the whole
transformation is visible without comparing intermediate rounds.
"""
import json
import os
import subprocess
import sys

REPO = "QuinOG/ClickAway"
BRANCH = os.environ.get("RSI_BRANCH") or subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
SHOTS_DIR = "docs/ui-polish/game-feel"

n = int(sys.argv[1])
scores = json.load(open(sys.argv[2], encoding="utf-8"))
latest = f"i{n}"
base_n = int(sys.argv[3]) if len(sys.argv) > 3 else 0
base = f"i{base_n}"
blob = f"https://github.com/{REPO}/blob/{BRANCH}/{SHOTS_DIR}"
tree = blob.replace("/blob/", "/tree/")

shots = sorted(f for f in os.listdir(os.path.join(SHOTS_DIR, latest)) if f.endswith(".png"))
JUDGES = ["Sol", "Terra", "Opus 5", "Gemini 4 Argon", "Qwen3.8 Max", "Grok 4.7"]  # scores.json lists follow this order
shown = {r: (vals + [None] * len(JUDGES))[:len(JUDGES)] for r, vals in scores.items() if r[1:].isdigit() and int(r[1:]) >= base_n}
used = [j for j in range(len(JUDGES)) if any(v[j] is not None for v in shown.values())]  # hide judges who sat out every shown round
score_rows = "\n".join(
    f"| {r}{' (baseline)' if r == base else ''}{' **latest**' if r == latest else ''} | "
    + " | ".join("—" if vals[j] is None else str(vals[j]) for j in used)
    + f" | **{sum(v for v in vals if v is not None) / len([v for v in vals if v is not None]):.2f}** |"
    for r, vals in shown.items()
)
def baseline_cell(s):
    # Screens added after i0 (e.g. 14-20 from i13) show their first capture as the baseline, used as the baseline.
    rounds = sorted((d for d in os.listdir(SHOTS_DIR) if d[:1] == "i" and d[1:].isdigit() and int(d[1:]) >= base_n), key=lambda d: int(d[1:]))
    first = next((r for r in rounds if os.path.exists(os.path.join(SHOTS_DIR, r, s))), None)
    if first is None:
        return "_not captured_"
    return f"![]({blob}/{first}/{s}?raw=true)"


def changed(s):
    old = os.path.join(SHOTS_DIR, base, s)
    return not os.path.exists(old) or open(old, "rb").read() != open(os.path.join(SHOTS_DIR, latest, s), "rb").read()


changed_shots = [s for s in shots if changed(s)]
changed_count = len(changed_shots)
shot_rows = "\n".join(
    f"| **{s.split('-', 1)[1][:-4]}** | " + baseline_cell(s) + f" | ![]({blob}/{latest}/{s}?raw=true) |"
    for s in changed_shots
)

PROCESS = os.environ.get("RSI_PROCESS") or "each round, judges rate the full-app screenshots against `docs/ui-polish/standards/`; Claude implements the highest-value fixes, recaptures, and repeats. Each round is its own commit, and each round's PR comment has its changes and before/after vs the previous round."

body = f"""Council-driven polish run (ClickawayRSI) to move ClickAway from a SaaS-dashboard feel to an indie-game feel across the whole app.

**Process:** {PROCESS}

## Scores
| Round | {" | ".join(JUDGES[j] for j in used)} | Average |
|---|{"---|" * len(used)}---|
{score_rows}

## Before → after for this run: baseline ({base}) → latest ({latest})
_One table per PR: the app as this run started ({base}) vs the latest round. It is regenerated every round and lists only screens that changed ({changed_count} of {len(shots)})._

| Screen | Baseline ({base}) | Latest ({latest}) |
|---|---|---|
{shot_rows}

All shots: [{base}]({tree}/{base}) · [{latest}]({tree}/{latest}) · change notes in `{SHOTS_DIR}/iN-changes.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)"""

json.dump({"body": body}, sys.stdout)
