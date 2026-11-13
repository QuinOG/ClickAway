# Animation strip from a slowed-playback frame capture.
#   python frame_sheet.py <frames dir> <out.png> [ms,ms,...] [title]
# Frame filenames end in -<animation ms>ms.png. Picks the frame nearest each requested time
# (default 6 points across a ~0.5s effect) and lays them out in one labelled row.
import re, sys
from pathlib import Path
from PIL import Image, ImageDraw
frames = sorted(Path(sys.argv[1]).glob("*.png"))
times = [int(m.group(1)) for f in frames for m in [re.search(r"-(\d+)ms\.png$", f.name)]]
wanted = [int(t) for t in sys.argv[3].split(",")] if len(sys.argv) > 3 else [0, 60, 140, 240, 340, 460]
picks = []
for t in wanted:
    i = min(range(len(times)), key=lambda k: abs(times[k] - t))
    if i not in picks: picks.append(i)
title = sys.argv[4] if len(sys.argv) > 4 else ""
w, h = Image.open(frames[0]).size
top = 24 if title else 0
sheet = Image.new("RGB", (len(picks) * (w + 6) + 6, h + 30 + top), "#0b1220")
draw = ImageDraw.Draw(sheet)
if title: draw.text((8, 6), title, fill="#ffffff")
for n, i in enumerate(picks):
    x = 6 + n * (w + 6)
    sheet.paste(Image.open(frames[i]), (x, top + 24))
    draw.text((x + 2, top + 6), f"{times[i]} ms", fill="#ffd36b")
sheet.save(sys.argv[2])
print(f"{len(picks)} frames ({', '.join(str(times[i]) for i in picks)} ms) -> {sys.argv[2]}")
