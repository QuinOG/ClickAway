# usage: python spacing_comment.py N "title" "summary paragraph" shot1,shot2 > comment.json
import json, os, subprocess, sys
n, title, summary, shots = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4].split(",")
BRANCH = os.environ.get("RSI_BRANCH") or subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
R = f"https://github.com/QuinOG/ClickAway/blob/{BRANCH}/docs/ui-polish/game-feel"
rows = "\n".join(f"| **{s.split('-', 1)[1][:-4]}** | ![]({R}/i{n-1}/{s}?raw=true) | ![]({R}/i{n}/{s}?raw=true) |" for s in shots)
json.dump({"body": f"### Round {n}: {title} (`{sha}`)\n\n{summary}\n\n| Screen | Before | After |\n|---|---|---|\n{rows}\n"}, sys.stdout)
