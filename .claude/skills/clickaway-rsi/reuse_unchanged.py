# Keep each round folder complete without re-committing screens nobody changed.
#   python reuse_unchanged.py PREV_DIR CUR_DIR 02-play,05-profile,...   (the screens this round changed)
# For every other screen: if the new capture differs from the previous round's by <= 2% of pixels
# (animation noise), the previous file is copied over it byte for byte, so git stores no new blob.
# Bigger differences are FLAGGED and left alone: look at them, since a shared-CSS change may have leaked.
import shutil, sys
from pathlib import Path
from PIL import Image, ImageChops

prev, cur = Path(sys.argv[1]), Path(sys.argv[2])
changed = {s.removesuffix(".png") for s in sys.argv[3].split(",") if s}
LIMIT = 0.02
flagged = False
for new in sorted(cur.glob("*.png")):
    name, old = new.stem, prev / new.name
    if name in changed:
        print(f"{name}: changed this round, kept"); continue
    if not old.exists():
        print(f"{name}: no previous shot, kept"); continue
    a, b = Image.open(old).convert("RGB"), Image.open(new).convert("RGB")
    if a.size != b.size:
        print(f"{name}: FLAGGED, size {a.size} -> {b.size}"); flagged = True; continue
    diff = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 24 else 0)
    share = sum(diff.histogram()[255:]) / (a.size[0] * a.size[1])
    if share <= LIMIT:
        shutil.copyfile(old, new)
        print(f"{name}: reused previous ({share:.2%} differed)")
    else:
        print(f"{name}: FLAGGED, {share:.2%} of pixels differ"); flagged = True
sys.exit(1 if flagged else 0)
