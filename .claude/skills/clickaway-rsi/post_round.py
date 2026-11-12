# usage: python post_round.py N "scores line" changes.md "consensus text" shot1,shot2,... > comment.json
import json, os, subprocess, sys
n, scores, changes, consensus, shots = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5].split(",")
BRANCH = os.environ.get("RSI_BRANCH") or subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
R = f"https://github.com/QuinOG/ClickAway/blob/{BRANCH}/docs/ui-polish/game-feel"
T = R.replace("/blob/", "/tree/")
prev = f"i{int(n)-1}"; cur = f"i{n}"
rows = "\n".join(f"| **{s.split('-',1)[1].replace('.png','')}** | ![]({R}/{prev}/{s}?raw=true) | ![]({R}/{cur}/{s}?raw=true) |" for s in shots)
body = f"""## Round {n} — {scores}

**Changes**
{open(changes, encoding='utf-8').read().split(':',1)[1].strip()}

**Council consensus for next round:** {consensus}

| Screen | Before ({prev}) | After ({cur}) |
|---|---|---|
{rows}

All shots: [{prev}]({T}/{prev}) → [{cur}]({T}/{cur})"""
json.dump({"body": body}, sys.stdout)
