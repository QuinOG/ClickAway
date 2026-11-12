# Trim, resize and palette-compress generated art in place.
#   python prep_art.py <max px> <file or folder> [...]   (skips files starting with "_", e.g. contact sheets)
# Keeps transparency; fully clears near-transparent haze (alpha < 40) left by the image tool.
import sys
from pathlib import Path
from PIL import Image
size = int(sys.argv[1])
files = [f for a in sys.argv[2:] for f in ([Path(a)] if Path(a).is_file() else sorted(Path(a).glob("*.png"))) if not f.name.startswith("_")]
for f in files:
    im = Image.open(f).convert("RGBA")
    a = im.getchannel("A").point(lambda v: 0 if v < 40 else v); im.putalpha(a)
    im = im.crop(im.getbbox()); im.thumbnail((size, size), Image.LANCZOS)
    im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(f, optimize=True)
    print(f"{f}  {im.size[0]}x{im.size[1]}  {f.stat().st_size // 1024}KB")
