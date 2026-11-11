# Generates ClickAway's illustrated item set: one hand, one light (top-left),
# 5px ink outline, flat base + one cel-shade crescent + one highlight.
import os, sys
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
INK = "#040912"

def svg(body, defs=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"><defs>{defs}<clipPath id="frame"><circle cx="64" cy="64" r="61"/></clipPath></defs><g clip-path="url(#frame)">{body}</g></svg>'

def sphere(name, base, shade, details="", r=50, extra_defs="", under=""):
    cid = f"c{name}"
    defs = f'<clipPath id="{cid}"><circle cx="64" cy="64" r="{r}"/></clipPath>' + extra_defs
    body = (under +
        f'<circle cx="64" cy="64" r="{r}" fill="{base}"/>'
        f'<g clip-path="url(#{cid})">{details}'
        f'<circle cx="86" cy="88" r="{r+6}" fill="none" stroke="{shade}" stroke-width="30" opacity=".9" transform="translate(-14 -14)"/>'
        f'</g>'
        f'<circle cx="64" cy="64" r="{r}" fill="none" stroke="{INK}" stroke-width="5"/>'
        f'<ellipse cx="44" cy="40" rx="13" ry="8" fill="#fff" opacity=".65" transform="rotate(-35 44 40)"/>'
        f'<circle cx="34" cy="54" r="3.5" fill="#fff" opacity=".5"/>')
    return svg(body, defs)

# The shade crescent: a thick stroke ring offset to the bottom-right, clipped to the sphere.
def crescent_fix(s):
    return s

items = {}
items["button"] = svg(
    f'<circle cx="64" cy="64" r="56" fill="#c3cede" stroke="{INK}" stroke-width="5"/>'
    f'<path d="M64 8a56 56 0 0 1 0 112" fill="none" stroke="#8a98ae" stroke-width="10" opacity=".8"/>'
    f'<circle cx="64" cy="64" r="40" fill="#e8322e" stroke="{INK}" stroke-width="5"/>'
    f'<path d="M92 50a40 40 0 0 1-50 46" fill="none" stroke="#a51d1d" stroke-width="12" stroke-linecap="round"/>'
    f'<ellipse cx="50" cy="46" rx="12" ry="7" fill="#fff" opacity=".7" transform="rotate(-35 50 46)"/>')
items["neoncircle"] = svg(
    f'<circle cx="64" cy="64" r="46" fill="none" stroke="{INK}" stroke-width="22"/>'
    f'<circle cx="64" cy="64" r="46" fill="none" stroke="#d94bff" stroke-width="14"/>'
    f'<circle cx="64" cy="64" r="46" fill="none" stroke="#ffc6ff" stroke-width="4"/>'
    f'<path d="M30 40a46 46 0 0 1 22-20" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>')
items["fireball"] = sphere("fire", "#ff8a1f", "#d4400f",
    details='<path d="M30 76q14-18 30-4t32-6M36 98q16-12 34-2" fill="none" stroke="#ffd25c" stroke-width="6" stroke-linecap="round"/>',
    r=42, under=f'<path d="M18 74C8 44 26 30 30 6c10 16 16 18 22 2 6 14 14 16 22-2 6 18 16 20 22 4 10 20 26 34 16 64" fill="#ffc94a" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><path d="M30 70C26 52 36 42 40 28c6 10 12 10 16 0 4 10 12 10 18 0 4 12 14 18 12 42" fill="#ff7a1a"/>')
items["cd"] = svg(
    f'<circle cx="64" cy="64" r="54" fill="#dfe6f0" stroke="{INK}" stroke-width="5"/>'
    f'<path d="M64 10a54 54 0 0 1 46 26L64 64Z" fill="#9ce8ff" opacity=".8"/>'
    f'<path d="M110 36a54 54 0 0 1 6 30L64 64Z" fill="#ffb3f0" opacity=".8"/>'
    f'<path d="M18 92a54 54 0 0 1-6-30L64 64Z" fill="#fff0a0" opacity=".8"/>'
    f'<path d="M100 104a54 54 0 0 1-66 6" fill="none" stroke="#9aa6ba" stroke-width="10"/>'
    f'<circle cx="64" cy="64" r="16" fill="#b9c4d4" stroke="{INK}" stroke-width="4"/>'
    f'<circle cx="64" cy="64" r="6" fill="#0b1424" stroke="{INK}" stroke-width="3"/>')
items["earth"] = sphere("earth", "#2f8ff0", "#1d5fb3",
    details=f'<path d="M22 40c14-6 22 4 30 0s10-14 22-12c-4 12 6 16 2 26s-18 6-22 18-14 6-18-4-18-14-14-28z" fill="#3ee56a" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M78 74c10-4 20 2 26 10-4 12-16 18-26 16s-8-22 0-26z" fill="#3ee56a" stroke="{INK}" stroke-width="3"/>')
items["melon"] = sphere("melon", "#e6d24a", "#b39a22",
    details='<g fill="none" stroke="#fff6c4" stroke-width="2.5" opacity=".85"><path d="M20 50q20-8 30 6t34-4 30 8M16 74q22-10 34 4t34-2 32 6M30 30l20 26-6 28 18 28M70 18l10 34-8 30 14 30M98 30l-6 28 10 30"/></g>')
items["moon"] = sphere("moon", "#c9d0db", "#8994a8",
    details=f'<circle cx="46" cy="72" r="10" fill="#9aa4b6" stroke="{INK}" stroke-width="3"/><circle cx="78" cy="44" r="7" fill="#9aa4b6" stroke="{INK}" stroke-width="3"/><circle cx="84" cy="82" r="5" fill="#9aa4b6" stroke="{INK}" stroke-width="3"/><circle cx="60" cy="96" r="4" fill="#9aa4b6"/>')
items["wheel"] = svg(
    f'<circle cx="64" cy="64" r="56" fill="#2a2f3a" stroke="{INK}" stroke-width="5"/>'
    f'<circle cx="64" cy="64" r="48" fill="none" stroke="#3c4354" stroke-width="4" stroke-dasharray="6 6"/>'
    f'<circle cx="64" cy="64" r="34" fill="#c3cede" stroke="{INK}" stroke-width="5"/>'
    + "".join(f'<path d="M64 64L{64+30*c:.1f} {64+30*s:.1f}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/><path d="M64 64L{64+30*c:.1f} {64+30*s:.1f}" stroke="#eef2f8" stroke-width="4" stroke-linecap="round"/>'
              for c, s in [(0, -1), (0.951, -0.309), (0.588, 0.809), (-0.588, 0.809), (-0.951, -0.309)])
    + f'<circle cx="64" cy="64" r="9" fill="#8a98ae" stroke="{INK}" stroke-width="4"/>')
items["xboxbutton"] = sphere("xbox", "#4a5ee8", "#2c3aa8",
    details=f'<path d="M42 40l44 48M86 40L42 88" stroke="{INK}" stroke-width="16" stroke-linecap="round"/><path d="M42 40l44 48M86 40L42 88" stroke="#dfe4ff" stroke-width="9" stroke-linecap="round"/>')
items["coin"] = sphere("coin", "#ffc94a", "#c98a24",
    details=f'<circle cx="64" cy="64" r="36" fill="none" stroke="#e8941c" stroke-width="5"/><path d="M76 48c-4-6-22-8-24 2s24 8 24 18-18 12-26 4M64 36v56" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M76 48c-4-6-22-8-24 2s24 8 24 18-18 12-26 4M64 36v56" fill="none" stroke="#fff1b0" stroke-width="3" stroke-linecap="round"/>')
items["donut"] = svg(
    f'<circle cx="64" cy="66" r="54" fill="#d9a25a" stroke="{INK}" stroke-width="5"/>'
    f'<path d="M14 62c6-30 30-46 50-46s46 14 50 46c-8 6-10 18-20 14s-14 10-24 4-16 8-26 0-14 4-22-4-6-12-8-14z" fill="#ff7ab8" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
    f'<circle cx="64" cy="64" r="16" fill="#0b1424" stroke="{INK}" stroke-width="5"/>'
    + "".join(f'<rect x="{x}" y="{y}" width="10" height="4" rx="2" fill="{c}" transform="rotate({a} {x+5} {y+2})"/>'
              for x, y, c, a in [(34, 34, "#4fd8ff", 30), (80, 30, "#ffe08a", -20), (92, 52, "#7dffb1", 60), (26, 56, "#fff", -40), (54, 26, "#7dffb1", 10), (74, 44, "#fff", 80)]))
items["bubble"] = svg(
    f'<circle cx="64" cy="64" r="50" fill="#9fe6ff" fill-opacity=".25" stroke="{INK}" stroke-width="5"/>'
    f'<path d="M108 52a46 46 0 0 1-56 56" fill="none" stroke="#ff9ce6" stroke-width="6" opacity=".8"/>'
    f'<path d="M106 70a44 44 0 0 1-30 34" fill="none" stroke="#fff0a0" stroke-width="4" opacity=".8"/>'
    f'<ellipse cx="44" cy="40" rx="14" ry="8" fill="#fff" opacity=".8" transform="rotate(-35 44 40)"/><circle cx="32" cy="58" r="4" fill="#fff" opacity=".7"/>')
items["tennis"] = sphere("tennis", "#c8f040", "#8fb820",
    details='<path d="M18 40c26 4 36 24 30 50M110 88c-26-4-36-24-30-50" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>')
items["eye"] = sphere("eye", "#f4f1ea", "#c9c2b4",
    details=f'<path d="M14 50q14 4 20 14M112 82q-14-2-22-12M30 102q8-10 16-12" stroke="#e8505a" stroke-width="2.5" fill="none"/>'
            f'<circle cx="68" cy="62" r="22" fill="#3ec27a" stroke="{INK}" stroke-width="4"/><circle cx="68" cy="62" r="10" fill="{INK}"/>'
            f'<circle cx="62" cy="56" r="4" fill="#fff"/>')
items["disco"] = sphere("disco", "#b9c4d4", "#7a879c",
    details='<g stroke="#5a6478" stroke-width="1.5">' + "".join(f'<rect x="{x}" y="{y}" width="15" height="15" fill="{["#e6edf6", "#9fe6ff", "#cfd7e4", "#ffb3f0"][(i * 3 + j) % 4]}"/>'
                    for i, x in enumerate(range(10, 118, 16)) for j, y in enumerate(range(10, 118, 16))) + '</g>')
items["poolball"] = sphere("pool", "#e8322e", "#a51d1d",
    details=f'<circle cx="62" cy="58" r="22" fill="#fff" stroke="{INK}" stroke-width="3"/><text x="62" y="70" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="32" fill="{INK}">7</text>')

# Profile portraits: same ink, same light, on a round badge.
def badge(name, bg, art):
    return svg(f'<circle cx="64" cy="64" r="58" fill="{bg}" stroke="{INK}" stroke-width="5"/>'
               f'<path d="M64 6a58 58 0 0 1 0 116" fill="#000" opacity=".14"/>' + art)
items["racoon"] = badge("racoon", "#3a5a86",
    f'<path d="M30 34l10 22M98 34l-10 22" stroke="{INK}" stroke-width="5"/><path d="M26 30l18 18-14 8zM102 30l-18 18 14 8z" fill="#8a94a6" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
    f'<ellipse cx="64" cy="72" rx="38" ry="32" fill="#a9b2c2" stroke="{INK}" stroke-width="5"/>'
    f'<path d="M28 66q18-14 36-2 18-12 36 2-6 14-18 10-12-8-18-2-6-6-18 2-12 4-18-10z" fill="#2a2f3a"/>'
    f'<circle cx="48" cy="66" r="5" fill="#fff"/><circle cx="80" cy="66" r="5" fill="#fff"/><ellipse cx="64" cy="84" rx="8" ry="6" fill="{INK}"/><path d="M50 94q14 8 28 0" fill="#f4f1ea" stroke="{INK}" stroke-width="3"/>')
items["lock"] = badge("lock", "#1d6a45",
    f'<path d="M42 58V44a22 22 0 0 1 44 0v14" fill="none" stroke="{INK}" stroke-width="16"/><path d="M42 58V44a22 22 0 0 1 44 0v14" fill="none" stroke="#c3cede" stroke-width="9"/>'
    f'<rect x="30" y="56" width="68" height="50" rx="10" fill="#ff9a2a" stroke="{INK}" stroke-width="5"/><path d="M98 66v30a10 10 0 0 1-10 10H60" fill="none" stroke="#c75e0e" stroke-width="8"/>'
    f'<circle cx="64" cy="76" r="7" fill="{INK}"/><path d="M64 80v12" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>')
items["heart"] = badge("heart", "#6a2a4a",
    f'<path d="M64 102S22 76 22 50a20 20 0 0 1 42-8 20 20 0 0 1 42 8c0 26-42 52-42 52z" fill="#ff5c8a" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
    f'<path d="M100 56c-4 18-24 34-36 42" fill="none" stroke="#c42a5a" stroke-width="8" stroke-linecap="round"/><ellipse cx="40" cy="46" rx="8" ry="5" fill="#fff" opacity=".7" transform="rotate(-35 40 46)"/>')
items["ghost"] = badge("ghost", "#3b2a6a",
    f'<path d="M34 102V58a30 30 0 0 1 60 0v44l-10-8-10 8-10-8-10 8-10-8z" fill="#f4f1ea" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
    f'<path d="M94 60v40l-10-8" fill="none" stroke="#c9c2b4" stroke-width="8"/><ellipse cx="54" cy="60" rx="5" ry="8" fill="{INK}"/><ellipse cx="74" cy="60" rx="5" ry="8" fill="{INK}"/><ellipse cx="64" cy="80" rx="6" ry="5" fill="{INK}"/>')
items["grape"] = badge("grape", "#2a4a3a",
    f'<path d="M64 30q2-12 14-16" fill="none" stroke="{INK}" stroke-width="5"/><path d="M66 26q14-10 26 0-12 10-26 0z" fill="#3ee56a" stroke="{INK}" stroke-width="4"/>'
    + "".join(f'<circle cx="{x}" cy="{y}" r="11" fill="#9a4bff" stroke="{INK}" stroke-width="4"/><circle cx="{x-4}" cy="{y-4}" r="3" fill="#fff" opacity=".6"/>'
              for x, y in [(48, 44), (68, 42), (86, 48), (56, 62), (76, 62), (64, 80), (46, 64), (66, 98)]))
items["flashlight"] = badge("flashlight", "#1d2f4a",
    f'<path d="M78 46L118 20v88L78 82z" fill="#fff0a0" opacity=".35"/>'
    f'<rect x="20" y="52" width="48" height="24" rx="6" fill="#4a5568" stroke="{INK}" stroke-width="5"/>'
    f'<path d="M66 46h12v36H66z" fill="#c3cede" stroke="{INK}" stroke-width="5"/><rect x="34" y="58" width="10" height="12" rx="2" fill="#ffc94a" stroke="{INK}" stroke-width="3"/>')

for name, s in items.items():
    open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8").write(s)
print(len(items), "files")
