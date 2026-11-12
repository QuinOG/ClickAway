# Before/after PR comment for one visual commit (run 3+: the user wants one after every commit).
#   python step_comment.py "<title>" "<one-paragraph summary>" <sha> BEFORE_PATH::AFTER_PATH [...] > comment.json
# Paths are repo-relative PNGs that are committed and pushed (e.g. docs/ui-polish/game-feel/i12/02-play.png::
# docs/ui-polish/game-feel/steps/01-target-stand/02-play.png). Links point at the current branch.
import json, os, subprocess, sys

title, summary, sha, pairs = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
branch = os.environ.get("RSI_BRANCH") or subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
blob = f"https://github.com/QuinOG/ClickAway/blob/{branch}"
rows = []
for pair in pairs:
    before, after = pair.split("::")
    name = os.path.basename(after).removesuffix(".png").split("-", 1)[-1]
    rows.append(f"| **{name}** | ![]({blob}/{before}?raw=true) | ![]({blob}/{after}?raw=true) |")
body = f"""### {title} (`{sha[:7]}`)

{summary}

| Screen | Before | After |
|---|---|---|
""" + "\n".join(rows)
json.dump({"body": body}, sys.stdout)
