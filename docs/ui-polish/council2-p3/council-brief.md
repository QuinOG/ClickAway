# Armory design council: pitch round 3

You are one of three independent design judges (Sol, Terra and Sonnet) for ClickAway, a browser click-precision arena game. Its Armory page is where the player builds a machine (core / lens / rig parts, mods, three powerup keys) and test-fires it. You review the **Armory page only**, using screenshots. Do not edit any files and do not read source code.

1. View the four quality references in `docs/ui-polish/standards/`.
2. View the four CURRENT Armory screenshots, 1440x900, in `docs/ui-polish/council2-p3/`:
   - `armory.png`: the default Armory view (Mods step)
   - `mods.png`: the Mods step with a part featured
   - `powers.png`: the Powerups step
   - `testrun.png`: the Test Run step
3. The previous round's screenshots are in `docs/ui-polish/council2-p2/` (same four names). Earlier scores: round 1 was Sol 7.6, Terra 7.0, Sonnet 7.3; round 2 was Sol 8.0, Terra 7.5, Sonnet 7.7.

## Last round's result: which pitches won, and why
Nine pitches came in. The implementer built three, choosing on how concrete the picture was, how much of the screen it changed, and whether several judges independently flagged the same problem.

**Built**
- **r70 Build bays become machine cartridges** (all three of you pitched it: Sol pitch 3, Terra pitch 2, Sonnet pitch 2). All three bays are equal cartridges that fill the rail. Each has a numbered spine in the build's identity colour, an ID strip, a miniature of its machine (core / lens / rig silhouettes around the target) in a recessed window, and a one-line field record, with Compare in the same corner on each. The structure is Sol's: ID strips, one stats strip and aligned Compare. Sonnet added reusing the machine art, and Terra added the spine.
- **r71 Swap report with actual measurements** (Sol pitch 2, plus one idea from Sonnet pitch 3). The top strip lost its mini speedometers and its five "STANDARD" captions. It now shows exact values, shows the candidate's value beside the current one while a part is previewed, and tags a stat only when it departs from stock (that last idea was Sonnet's). Under the featured part, the bars and ±2 scores became a Current → With <part> table edged mint or coral. Sol won here because the pitch named the exact numbers to surface and the encodings to remove.
- **r72 The hardware is in charge** (Sol pitch 1, plus Terra pitch 1). The aperture shrank by about 20%. The wide coloured arcs became a thin accent inside a segmented steel housing on a mounting yoke. The core gained cooling fins and a recessed chamber, the lens a thick glass with retaining clips, and the rig a two-cell battery with terminals and charge windows. Each is about 50% larger, and each name plate hangs from its component on a bracket. Sol's aperture reduction and per-part detail set the build; Terra contributed the housing and yoke.

**Not built**
- Sonnet pitch 1 (a three-row Core / Lens / Rig parts rack filling the Mods pane). The empty space it targets is real, but the pitch changes how the picker works rather than how it looks, and it ranked fourth.
- Terra pitch 3 (part-specific illustrations in a parts cabinet). It was ambitious, but it needs about 15 bespoke illustrations, and the pitch did not say how to keep them consistent.
- Sonnet pitch 3's analogue gauges. They pulled in the opposite direction to Sol's measurement-first panel, which read more clearly. Only the "tag only when it departs from stock" idea was used.

Sol has had five of six pitches built across two rounds. Sol's pitches won on specificity and on naming what to remove as well as what to add. Terra and Sonnet each had ideas folded in but no outright wins in round 2.

## Your job
First, score the CURRENT Armory screen out of 10. 10 is best-in-class shipped game UI; 9 fits comfortably beside the references; 8 is a polished indie game with a few rough edges; 7 is competent but partly reads as a web app or template; 6 is a well-styled dark dashboard; 5 or below is generic or unfinished. Do not inflate, and do not reward effort. Say whether r70–r72 helped, and whether any of them fell short of its pitch.

Then **pitch three new changes**. The implementer builds only the three most compelling of the nine. You may re-pitch an unbuilt idea, or pitch a fix to a built one that fell short, if you can make a stronger case. A strong pitch:
- names a specific region and says exactly what it becomes (what to move, merge, resize, restyle, redraw, add or remove);
- explains **how** it would be built well enough that the implementer can picture the result;
- argues **why** it is a significant improvement: what problem a player sees today, and what the screen gains (hierarchy, focus, use of space, readability, game-workshop feel);
- is visible in a still screenshot. Layout, composition, typography, colour, icons, illustration and surface treatment are all fair game. Animation and motion are not.

Return at most about 600 words, in exactly this shape:

OVERALL: <one decimal>/10
VERDICT: <2-3 sentences, including whether r70–r72 helped>
PITCH 1: <title>
- What: ...
- How: ...
- Why: ...
PITCH 2: <title>
- What / How / Why as above
PITCH 3: <title>
- What / How / Why as above
