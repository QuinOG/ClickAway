# Blind A/B gate run before the full council, so a round that went backwards is caught cheaply.
#   python ab_gate.py make PREV_DIR CUR_DIR OUT_DIR 02-play,05-profile,...
#       copies each screen's before/after shot to OUT_DIR as <screen>-X.png / <screen>-Y.png in random
#       order and writes the key to OUT_DIR/../ab-key.json (outside the folder the gate judge reads).
#   python ab_gate.py score OUT_DIR REPLY_FILE
#       reply lines look like "07-duels: Y | +0.6 | <reason>" (or "same"); prints per-screen verdicts
#       translated back to NEW/OLD and exits 1 if any screen is not better.
import json, random, re, shutil, sys
from pathlib import Path

cmd = sys.argv[1]
if cmd == "make":
    prev, cur, out, screens = Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5].split(",")
    out.mkdir(parents=True, exist_ok=True)
    key = {}
    for s in screens:
        s = s.removesuffix(".png")
        new_is_x = random.random() < 0.5
        shutil.copy(cur / f"{s}.png", out / f"{s}-{'X' if new_is_x else 'Y'}.png")
        shutil.copy(prev / f"{s}.png", out / f"{s}-{'Y' if new_is_x else 'X'}.png")
        key[s] = "X" if new_is_x else "Y"
    (out.parent / "ab-key.json").write_text(json.dumps(key, indent=1))
    print(f"{len(key)} pairs in {out}")
elif cmd == "score":
    out, reply = Path(sys.argv[2]), Path(sys.argv[3]).read_text(encoding="utf-8-sig")
    key = json.loads((out.parent / "ab-key.json").read_text())
    failed = False
    for s, new in key.items():
        m = re.search(rf"^\s*{re.escape(s)}\s*:\s*(X|Y|same)\s*\|\s*([+-]?[\d.]+)?\s*\|?\s*(.*)$", reply, re.M | re.I)
        if not m:
            print(f"{s}: NO VERDICT"); failed = True; continue
        pick = m.group(1).upper()
        verdict = "NEW better" if pick == new else "SAME" if pick == "SAME" else "OLD better"
        failed |= verdict != "NEW better"
        print(f"{s}: {verdict} by {m.group(2) or '0'} | {m.group(3).strip()}")
    sys.exit(1 if failed else 0)
