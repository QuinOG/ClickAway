Profile and Competitor Pass visual notes

Purpose: make progression and player identity readable for new players.
Tone: tactile arcade meters, using the existing game palette and typography.
Constraints: React, existing motion dependency, CRLF, reduced motion, 390px and 1440px.
Differentiator: chunky rounded fills with a restrained static sheen and a single entrance animation.

A third-party progress package would add dependency and styling overhead for a simple determinate meter. Native progressbar semantics plus the existing motion package cover accessible values, clamping, a single fill entrance, and reduced-motion preferences in one shared component. A package would be more useful for complex multi-stage or indeterminate workflows; these XP and achievement meters do not need those features.
