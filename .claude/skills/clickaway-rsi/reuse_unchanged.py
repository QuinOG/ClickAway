# Keep each round folder complete without re-committing screens nobody changed.
#   python reuse_unchanged.py PREV_DIR CUR_DIR 02-play,05-profile,...   (the screens this round changed)
# For every other screen: if the new capture differs from the previous round's by no more than the limit
# for that screen (animation noise), the previous file is copied over it byte for byte, so git stores no new blob.
# Limits are per screen: only screens with animated art may differ noticeably between identical builds.
# Bigger differences are FLAGGED and left alone: look at them, since a shared-CSS change may have leaked.
import shutil, sys
from pathlib import Path
from PIL import Image, ImageChops

prev, cur = Path(sys.argv[1]), Path(sys.argv[2])
changed = {s.removesuffix(".png") for s in sys.argv[3].split(",") if s}
# Measured on identical builds (i11 -> i12 unchanged screens): static pages differ by ~0.00%, the animated ones up to
# ~0.9%. A real change can be tiny (new portraits moved Ladder by 0.44% and the nav avatar moved Play by 0.03%), so
# static screens get a tight limit.
ANIMATED = {"01-login": 0.003, "11-live-round": 0.02, "12-results": 0.005, "13-rankup": 0.015}
STATIC_LIMIT = 0.00005  # a 40px nav avatar on a tall page is ~0.02%
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
    if share <= ANIMATED.get(name, STATIC_LIMIT):
        shutil.copyfile(old, new)
        print(f"{name}: reused previous ({share:.2%} differed)")
    else:
        print(f"{name}: FLAGGED, {share:.2%} of pixels differ"); flagged = True
sys.exit(1 if flagged else 0)
