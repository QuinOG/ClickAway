import { AnimatePresence, motion } from "motion/react"

import { usePrefersReducedMotion } from "./gameRoundOverlayMotionHooks.js"

const MotionDiv = motion.div
const COUNTDOWN_EASE = [0.22, 1, 0.36, 1]

function CalibrationReticle() {
  return (
    <div className="entranceReticle" aria-hidden="true">
      <span className="entranceReticleRing entranceReticleRingOuter" />
      <span className="entranceReticleRing entranceReticleRingInner" />
      <span className="entranceReticleCross entranceReticleCrossHorizontal" />
      <span className="entranceReticleCross entranceReticleCrossVertical" />
      <span className="entranceReticleCore" />
    </div>
  )
}

export function CountdownOverlay({
  countdownValue,
  modeId = "normal",
  modeLabel = "Casual",
  loadoutName = "Loadout",
  startStatus = "countdown",
  startError = "",
  isGoCue = false,
  onRetry,
  onCancel,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const isWaiting = startStatus === "requesting"
  const isError = startStatus === "error"
  const spokenCue = isWaiting
    ? "Securing Ranked round"
    : isError
      ? "Ranked round could not be secured"
      : isGoCue
        ? "Go"
        : String(countdownValue)

  return (
    <MotionDiv
      className={`roundEntranceOverlay roundEntrance-${modeId} ${isGoCue ? "isGo" : ""}`}
      onClick={(event) => event.stopPropagation()}
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.14, ease: COUNTDOWN_EASE }}
    >
      <div className="roundEntranceWash" aria-hidden="true" />
      <CalibrationReticle />

      <div className="roundEntranceBrief" aria-hidden="true">
        <span>{modeLabel} arena</span>
        <strong>{loadoutName}</strong>
      </div>

      <span className="uiVisuallyHidden" role="status" aria-live="polite" aria-atomic="true">
        {spokenCue}
      </span>

      {isWaiting || isError ? (
        <div className={`roundTokenStatus ${isError ? "isError" : ""}`} role={isError ? "alert" : undefined}>
          <span className="roundTokenStatusKicker">Ranked authorization</span>
          <strong>{isWaiting ? "Securing your round" : "Round not secured"}</strong>
          <p>{isWaiting
            ? "Waiting for a server token. The countdown starts only when the round is verified."
            : (startError || "The Ranked server did not issue a round token.")}</p>
          {isWaiting ? <span className="roundTokenProgress" aria-hidden="true" /> : null}
          <div className="roundTokenActions">
            {isError ? <button type="button" onClick={onRetry}>Retry</button> : null}
            <button type="button" className="isQuiet" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="roundCountdownCue" aria-hidden="true">
          <AnimatePresence initial={false} mode="wait">
            <MotionDiv
              key={isGoCue ? "go" : countdownValue}
              className={`roundCountdownValue ${isGoCue ? "isGo" : ""}`}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 1.18 }}
              transition={prefersReducedMotion
                ? { duration: 0 }
                : { duration: isGoCue ? 0.1 : 0.22, ease: COUNTDOWN_EASE }}
            >
              {isGoCue ? "GO" : countdownValue}
            </MotionDiv>
          </AnimatePresence>
          <span className="roundCountdownInstruction">
            {isGoCue ? "Target live" : "Input locked · center your aim"}
          </span>
        </div>
      )}
    </MotionDiv>
  )
}
