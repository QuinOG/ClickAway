# usage: python council.py N
# Reads docs/ui-polish/game-feel/replies/iN/<judge>.md (brief v2 format), writes iN-screens.json
# (per-judge screen scores, the next round's PREVIOUS_SCORES) and prints the decision tables.
import json, re, sys
from pathlib import Path

ROOT = Path("docs/ui-polish/game-feel")
SCREENS = []  # filled from the round's screenshot folder, so new captures (14+) are picked up automatically
BARS = {"sol": 9.4}            # everyone else: 9.0
CONF = {"high": 1.0, "med": 0.7, "low": 0.4}


def screen_key(token):
    t = token.strip().lower()
    for s in SCREENS:
        if t.startswith(s[:2]) or s.split("-", 1)[1].split("-")[0] in t:
            return s
    return t


def parse(path):
    text = path.read_text(encoding="utf-8")
    screens, items = {}, []
    for m in re.finditer(r"^\s*(\d\d-[a-z-]+)\s*:\s*([\d.]+)\s*\|\s*(.*)$", text, re.M):
        screens[screen_key(m.group(1))] = (float(m.group(2)), m.group(3).strip())
    block = re.search(r"MOVE THE NEEDLE:(.*?)(?:DON'T BOTHER:|$)", text, re.S)
    for line in re.findall(r"^\s*\d+\.\s*(.+)$", block.group(1) if block else "", re.M):
        m = re.search(r"\|\s*([\w-]+)\s+([\d.]+)\s*(?:→|->)\s*([\d.]+)\s*\|\s*conf\s+(high|med|low)\s*\|\s*ACCEPT:\s*(.+)$", line, re.I)
        if not m:
            print(f"!! unparsed item in {path.name}: {line[:90]}", file=sys.stderr)
            continue
        items.append({"screen": screen_key(m.group(1)), "change": line[:m.start()].strip(),
                      "now": float(m.group(2)), "after": float(m.group(3)),
                      "conf": m.group(4).lower(), "accept": m.group(5).strip()})
    return screens, items


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    n = int(sys.argv[1])
    SCREENS[:] = sorted(p.stem for p in (ROOT / f"i{n}").glob("*.png"))
    replies = sorted((ROOT / "replies" / f"i{n}").glob("*.md"))
    cal = json.loads((ROOT / "calibration.json").read_text()) if (ROOT / "calibration.json").exists() else {}
    prev_file = ROOT / f"i{n-1}-screens.json"
    prev = json.loads(prev_file.read_text()) if prev_file.exists() else {}
    data = {p.stem: parse(p) for p in replies}
    judges = list(data)

    out = {j: {s: data[j][0].get(s, (None, ""))[0] for s in SCREENS} for j in judges}
    (ROOT / f"i{n}-screens.json").write_text(json.dumps(out, indent=1), encoding="utf-8")

    def fmt(j, s):
        v = out[j][s]
        if v is None:
            return "—"
        p = prev.get(j, {}).get(s)
        return f"{v:.1f}" + (f" ({v - p:+.1f})" if p is not None and abs(v - p) >= 0.05 else "")

    print(f"## Screen scores i{n}\n\n| Screen | " + " | ".join(judges) + " | Mean |\n|---|" + "---|" * (len(judges) + 1))
    for s in SCREENS:
        vals = [out[j][s] for j in judges if out[j][s] is not None]
        mean = sum(vals) / len(vals) if vals else 0
        print(f"| {s} | " + " | ".join(fmt(j, s) for j in judges) + f" | {mean:.2f} |")
    overall = {}
    for j in judges:
        vals = [v for v in out[j].values() if v is not None]
        overall[j] = sum(vals) / len(vals) if vals else 0
    print("| **OVERALL** | " + " | ".join(f"**{overall[j]:.2f}**" for j in judges) + " | |\n")

    gaps = sorted(judges, key=lambda j: overall[j] - BARS.get(j, 9.0))
    weight = {j: (1.3 if i == 0 else 1.15 if i == 1 else 1.0) for i, j in enumerate(gaps)}
    print("Bottleneck order (weights): " + ", ".join(f"{j} ×{weight[j]}" for j in gaps) + "\n")

    rows = []
    for j in judges:
        for i, it in enumerate(data[j][1], 1):
            d = max(0.0, it["after"] - it["now"])
            gain = d / len(SCREENS) * CONF[it["conf"]] * cal.get(j, 0.5)
            rows.append((gain * weight[j], gain, j, i, it))
    rows.sort(key=lambda r: -r[0])
    print("## Items ranked by expected overall gain (after confidence and calibration)\n")
    print("| Value | Judge#item | Screen | now→after | Gain to that judge | Change | ACCEPT |\n|---|---|---|---|---|---|---|")
    for v, g, j, i, it in rows:
        print(f"| {v:.3f} | {j}#{i} | {it['screen']} | {it['now']}→{it['after']} ({it['conf']}) | +{g:.3f} | {it['change'][:110]} | {it['accept'][:110]} |")

    print("\n## Screens with asks from several judges\n\n| Screen | Judges | Summed value |\n|---|---|---|")
    by = {}
    for v, g, j, i, it in rows:
        by.setdefault(it["screen"], {}).setdefault(j, 0)
        by[it["screen"]][j] = max(by[it["screen"]][j], v)
    for s, js in sorted(by.items(), key=lambda kv: (-len(kv[1]), -sum(kv[1].values()))):
        print(f"| {s} | {', '.join(js)} ({len(js)}) | {sum(js.values()):.3f} |")


if __name__ == "__main__":
    main()
