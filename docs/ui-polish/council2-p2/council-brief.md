# Armory design council: pitch round 2

You are one of three independent design judges (Sol, Terra and Sonnet) for ClickAway, a browser click-precision arena game. Its Armory page is where the player builds a machine (core / lens / rig parts, mods, three powerup keys) and test-fires it. You review the **Armory page only**, using screenshots. Do not edit any files and do not read source code.

1. View the four quality references in `docs/ui-polish/standards/`.
2. View the four CURRENT Armory screenshots, 1440x900, in `docs/ui-polish/council2-p2/`:
   - `armory.png`: the default Armory view (Mods step)
   - `mods.png`: the Mods step with a part featured
   - `powers.png`: the Powerups step
   - `testrun.png`: the Test Run step
3. The previous round's screenshots are in `docs/ui-polish/council2-p1/` (same four names). Last round's scores: Sol 7.6, Terra 7.0, Sonnet 7.3.

## Last round's result: which pitches won, and why
Nine pitches came in. The implementer built three, choosing on how concrete the picture was and how much of the screen it changed.

**Built**
- **r67 Parts tray** (Sol's pitch 2, which beat Terra's pitch 2 and Sonnet's pitch 3 on the same idea). Picker tiles dropped their description paragraphs and became tray components: a large socketed emblem, the name, and one state plate (installed, on a key, or locked at a level). Locked parts sink to the end. Sol won on specifics: the state plate, removing duplicate text, and pushing locked parts down.
- **r68 Firing range in Test Run** (Sol's pitch 3 combined with Terra's pitch 3). The empty panel became a lane with the target drawn at its real start size, a dashed ghost of its floor, a dimension line, and start / floor / per-hit / per-miss rules pinned to the corners. The launch button shrank to a footer control. Sol's ghost outline and edge annotations, plus Terra's instrument strip and smaller button.
- **r69 Assembled machine on a bench** (all three pitched it; built mostly from Sol's pitch 1, plus Sonnet's pitch 1 for the bench and blueprint treatment). Core, lens and rig now have distinct silhouettes: a vented core housing, a bezelled glass lens and a battery-pack rig. Solid bolted arms replace the dotted conduits. The machine sits in a riveted cradle on a faint blueprint grid, and the three power keys share one console plate.

**Not built**
- Sonnet pitch 2 (the build-bay column becomes three tall illustrated loadout cards plus a locked fourth). It was a credible pitch but ranked fourth: it fixes a secondary column while the three winners changed the main surfaces.
- Terra pitch 1 and Sonnet pitch 1 were folded into r69. Sol's version carried the build, and Sonnet's added the bench.
- Sonnet pitch 3 (the right pane as a showcase) overlapped r67 and r68. Its Test Run half lost to the more specific firing-range pitches.

Sol's pitches won this round because each named exact parts and states, so the result could be pictured before it was built. Pitches with that level of specificity will compete best.

## Your job
First, score the CURRENT Armory screen out of 10. 10 is best-in-class shipped game UI; 9 fits comfortably beside the references; 8 is a polished indie game with a few rough edges; 7 is competent but partly reads as a web app or template; 6 is a well-styled dark dashboard; 5 or below is generic or unfinished. Do not inflate, and do not reward effort. Say whether the three changes helped, and whether any of them fell short of its pitch.

Then **pitch three new changes**. You are competing with the other two judges again: the implementer builds only the three most compelling of the nine. You may re-pitch an unbuilt idea, or pitch a fix to a built one that fell short, if you can make a stronger case. A strong pitch:
- names a specific region and says exactly what it becomes (what to move, merge, resize, restyle, redraw, add or remove);
- explains **how** it would be built well enough that the implementer can picture the result;
- argues **why** it is a significant improvement: what problem a player sees today, and what the screen gains (hierarchy, focus, use of space, readability, game-workshop feel);
- is visible in a still screenshot. Layout, composition, typography, colour, icons, illustration and surface treatment are all fair game. Animation and motion are not.

Return at most about 600 words, in exactly this shape:

OVERALL: <one decimal>/10
VERDICT: <2-3 sentences, including whether r67–r69 helped>
PITCH 1: <title>
- What: ...
- How: ...
- Why: ...
PITCH 2: <title>
- What / How / Why as above
PITCH 3: <title>
- What / How / Why as above
