# ClickAway feedback framework

Phase 1 uses a small event-driven presentation layer. It does not participate
in scoring, round timing, geometry, persistence, or server verification.

## Device-local preferences

Preferences are stored under `clickaway.feedback-preferences.v1` and normalized
before use. They include master/effect volume, mute, feedback intensity, reduced
motion, screen shake, celebration effects, and optional haptics. Haptics default
off and are never enabled automatically. An OS reduced-motion preference always
wins over local shake, travel, and celebration choices.

## Frozen event names

- `navigation.commit`
- `action.confirm`
- `action.deny`
- `round.countdown.tick`
- `round.countdown.go`
- `round.hit`
- `round.miss`
- `round.guard`
- `round.streak.milestone`
- `power.ready`
- `power.activate`
- `round.time.low`
- `reward.granted`
- `rank.changed`
- `settings.test`

Later roadmap phases may change the presentation attached to an event, but must
not rename the event or move it into deterministic game logic.

## Sound provenance and lifecycle

The representative Phase 1 cues are original procedural Web Audio tones. No
third-party recording, generated binary sound file, music, or licensed sample is
shipped, so there is no external audio attribution requirement. Oscillator
recipes are defined in `src/services/feedbackService.js`.

Audio is created and resumed only following pointer or keyboard activation.
Unavailable or suspended audio fails silently; it never throws through an input
handler. Voices are capped, duplicate event IDs are suppressed, route/phase and
background transitions stop active voices, and mute immediately cancels output.

## Equivalent feedback

Audio and vibration are supplemental. Existing hit/miss text, charge labels,
countdown values, timer treatment, reward text, and rank text remain the source
of truth. Reduced motion keeps hit/miss text visible for its normal controller-
owned lifetime and replaces moving transitions with immediate state changes.
