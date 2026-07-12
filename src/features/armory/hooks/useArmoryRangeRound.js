import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createRoundSimulation } from "../../../game/engine/roundEngine.js"
import {
  FREEZE_MOVEMENT_DURATION_MS,
  MAGNET_CENTER_FREEZE_MS,
  SIZE_LOCK_DURATION_MS,
} from "../../../game/engine/roundGeometry.js"
import {
  FEEDBACK_LIFETIME_MS,
  READY_COUNTDOWN_START,
  ROUND_END_SETTLE_MS,
  TIMER_TICK_MS,
} from "../../../constants/gameConstants.js"
import {
  getButtonLabel,
  getButtonLabelFontSize,
  getCenteredPosition,
  getComboMultiplier,
  getNextButtonSize,
  getRandomPosition,
} from "../../../utils/gameMath.js"

// The range is a fixed, always-timed 10-second sample regardless of the mode's
// own duration (Practice is untimed in a real round, but here it still ends).
export const RANGE_DURATION_SECONDS = 10

export const RANGE_PHASE = {
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  DONE: "done",
}

const MAX_FEEDBACK_ITEMS = 12

function buildStartingCharges(equippedPowerups = [], startingCharges = 0) {
  return equippedPowerups.reduce((chargesById, powerup) => {
    chargesById[powerup.id] = Math.max(0, Number(startingCharges) || 0)
    return chargesById
  }, {})
}

/**
 * A self-contained, throwaway round loop for the Test Range. It composes the
 * deterministic {@link createRoundSimulation} directly — never the game
 * controller — so it inherits none of its persistence, server-token, or
 * progression concerns. Nothing here is written to history, lifetime stats, or
 * the server: the run exists only to let a player feel a build.
 */
export function useArmoryRangeRound({
  roundRules,
  isActive,
  runToken,
  onExit,
}) {
  const arenaRef = useRef(null)
  const simulationRef = useRef(null)
  const roundStartTimeRef = useRef(0)
  const freezeMovementUntilRef = useRef(0)
  const sizeLockUntilRef = useRef(0)
  const countdownEndsAtRef = useRef(0)
  const feedbackTimeoutIdsRef = useRef([])
  const endTimeoutRef = useRef(null)
  const activationCueTimeoutRef = useRef(null)
  const rngRef = useRef(Math.random)

  const [phase, setPhase] = useState(RANGE_PHASE.COUNTDOWN)
  const [countdownValue, setCountdownValue] = useState(READY_COUNTDOWN_START)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [chargesEarned, setChargesEarned] = useState(0)
  const [buttonSize, setButtonSize] = useState(roundRules.initialButtonSize)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [timeLeft, setTimeLeft] = useState(RANGE_DURATION_SECONDS)
  const [targetSpawnSequence, setTargetSpawnSequence] = useState(0)
  const [clickFeedbackItems, setClickFeedbackItems] = useState([])
  const [powerupCharges, setPowerupCharges] = useState(() => (
    buildStartingCharges(roundRules.equippedPowerups, roundRules.startingPowerupCharges)
  ))
  const [comboSurgeHitsRemaining, setComboSurgeHitsRemaining] = useState(0)
  const [guardActiveUntilMs, setGuardActiveUntilMs] = useState(0)
  const [activatedPowerup, setActivatedPowerup] = useState(null)

  const isTimedRoundForPowers = roundRules.isTimedRound !== false
  const isPlaying = phase === RANGE_PHASE.PLAYING

  const getElapsedMs = useCallback(() => (
    roundStartTimeRef.current > 0 ? Date.now() - roundStartTimeRef.current : 0
  ), [])

  const clearFeedbackTimeouts = useCallback(() => {
    feedbackTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    feedbackTimeoutIdsRef.current = []
  }, [])

  const centerButton = useCallback((nextSize) => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    setButtonPosition(getCenteredPosition(rect, nextSize))
  }, [])

  const randomizeButton = useCallback((nextSize) => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    setButtonPosition(getRandomPosition(rect, nextSize, rngRef.current))
    setTargetSpawnSequence((sequence) => sequence + 1)
  }, [])

  const addClickFeedback = useCallback((clientX, clientY, value, type) => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const feedbackId = `${Date.now()}-${Math.random()}`

    setClickFeedbackItems((items) => [
      ...items.slice(-(MAX_FEEDBACK_ITEMS - 1)),
      { id: feedbackId, x: clientX - rect.left, y: clientY - rect.top, value, type },
    ])

    const timeoutId = window.setTimeout(() => {
      setClickFeedbackItems((items) => items.filter((item) => item.id !== feedbackId))
      feedbackTimeoutIdsRef.current = feedbackTimeoutIdsRef.current.filter((id) => id !== timeoutId)
    }, FEEDBACK_LIFETIME_MS)
    feedbackTimeoutIdsRef.current.push(timeoutId)
  }, [])

  const addCenterFeedback = useCallback((value, type) => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    addClickFeedback(rect.left + rect.width / 2, rect.top + rect.height / 2, value, type)
  }, [addClickFeedback])

  const endRound = useCallback(() => {
    setPhase((current) => {
      if (current === RANGE_PHASE.DONE) return current
      if (endTimeoutRef.current) window.clearTimeout(endTimeoutRef.current)
      endTimeoutRef.current = window.setTimeout(() => {
        setPhase(RANGE_PHASE.DONE)
        endTimeoutRef.current = null
      }, ROUND_END_SETTLE_MS)
      return current
    })
  }, [])

  // (Re)start the sample whenever the overlay opens or "Run it again" bumps the
  // token. Everything derives fresh from the current rules — no carryover.
  useEffect(() => {
    if (!isActive) return undefined

    simulationRef.current = createRoundSimulation(roundRules)
    rngRef.current = Math.random
    roundStartTimeRef.current = 0
    freezeMovementUntilRef.current = 0
    sizeLockUntilRef.current = 0

    setPhase(RANGE_PHASE.COUNTDOWN)
    setCountdownValue(READY_COUNTDOWN_START)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setHits(0)
    setMisses(0)
    setChargesEarned(0)
    setButtonSize(roundRules.initialButtonSize)
    setTimeLeft(RANGE_DURATION_SECONDS)
    setTargetSpawnSequence(0)
    setClickFeedbackItems([])
    setPowerupCharges(buildStartingCharges(roundRules.equippedPowerups, roundRules.startingPowerupCharges))
    setComboSurgeHitsRemaining(0)
    setGuardActiveUntilMs(0)
    setActivatedPowerup(null)
    clearFeedbackTimeouts()

    const frameId = window.requestAnimationFrame(() => centerButton(roundRules.initialButtonSize))
    countdownEndsAtRef.current = Date.now() + READY_COUNTDOWN_START * TIMER_TICK_MS

    return () => window.cancelAnimationFrame(frameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, runToken])

  // Countdown → activate the playable sample.
  useEffect(() => {
    if (!isActive || phase !== RANGE_PHASE.COUNTDOWN) return undefined

    let timeoutId = null
    const tick = () => {
      const remainingMs = countdownEndsAtRef.current - Date.now()
      if (remainingMs <= 0) {
        roundStartTimeRef.current = Date.now()
        setCountdownValue(0)
        setPhase(RANGE_PHASE.PLAYING)
        setTargetSpawnSequence((sequence) => sequence + 1)
        randomizeButton(roundRules.initialButtonSize)
        return
      }
      setCountdownValue(Math.ceil(remainingMs / TIMER_TICK_MS))
      timeoutId = window.setTimeout(tick, Math.max(16, remainingMs - (Math.ceil(remainingMs / TIMER_TICK_MS) - 1) * TIMER_TICK_MS))
    }

    timeoutId = window.setTimeout(tick, TIMER_TICK_MS)
    return () => window.clearTimeout(timeoutId)
  }, [isActive, phase, randomizeButton, roundRules.initialButtonSize])

  // The 10-second sample clock. Always runs so even untimed modes terminate.
  useEffect(() => {
    if (!isPlaying) return undefined

    const intervalId = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          endRound()
          return 0
        }
        return current - 1
      })
    }, TIMER_TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [endRound, isPlaying])

  const handleButtonClick = useCallback((event) => {
    event.stopPropagation()
    if (!isPlaying || !simulationRef.current) return

    const eventTimeMs = getElapsedMs()
    const result = simulationRef.current.applyHit(eventTimeMs)
    setScore(result.score)
    setStreak(result.streak)
    setBestStreak(result.bestStreak)
    setHits(result.hits)
    setPowerupCharges(result.powerupCharges)
    setComboSurgeHitsRemaining(result.comboSurgeHitsRemaining)

    addClickFeedback(
      event.clientX,
      event.clientY,
      `+${result.pointsEarned}`,
      result.comboSurgeHitsRemaining > 0 ? "hit comboHit" : "hit"
    )
    if (result.grantedPowerups.length > 0) {
      setChargesEarned((count) => count + result.grantedPowerups.length)
      result.grantedPowerups.forEach((powerup) => addCenterFeedback(`${powerup.slotKey}+`, "positive"))
    }

    setButtonSize((currentSize) => {
      const nextSize = eventTimeMs < sizeLockUntilRef.current
        ? currentSize
        : getNextButtonSize(currentSize, roundRules)
      if (getElapsedMs() >= freezeMovementUntilRef.current) {
        window.setTimeout(() => {
          if (getElapsedMs() >= freezeMovementUntilRef.current) randomizeButton(nextSize)
        }, 0)
      }
      return nextSize
    })
  }, [addCenterFeedback, addClickFeedback, getElapsedMs, isPlaying, randomizeButton, roundRules])

  const handleArenaClick = useCallback((event) => {
    if (!isPlaying || !simulationRef.current) return

    const result = simulationRef.current.applyMiss(getElapsedMs())
    setScore(result.score)
    setStreak(result.streak)
    setMisses(result.misses)
    setGuardActiveUntilMs(result.guardActiveUntilMs)

    if (result.guarded) {
      addClickFeedback(event.clientX, event.clientY, "Absorbed", "guarded")
      return
    }
    addClickFeedback(
      event.clientX,
      event.clientY,
      result.penaltyApplied > 0 ? `-${result.penaltyApplied}` : "Miss",
      streak > 0 ? "streakBreak" : "miss"
    )
  }, [addClickFeedback, getElapsedMs, isPlaying, streak])

  const applyPowerupPresentation = useCallback((powerup, eventTimeMs) => {
    if (powerup.effectType === "time_boost") {
      setTimeLeft((current) => Math.min(roundRules.maxTimeBufferSeconds ?? current + 2, current + 2))
      addCenterFeedback("+2s", "power power-time_boost")
    } else if (powerup.effectType === "size_boost") {
      setButtonSize((size) => Math.min(roundRules.initialButtonSize, size + 10))
      setTargetSpawnSequence((sequence) => sequence + 1)
      addCenterFeedback("Grow", "power power-size_boost")
    } else if (powerup.effectType === "freeze_movement") {
      freezeMovementUntilRef.current = eventTimeMs + FREEZE_MOVEMENT_DURATION_MS
      addCenterFeedback("Freeze", "power power-freeze_movement")
    } else if (powerup.effectType === "magnet_center") {
      freezeMovementUntilRef.current = eventTimeMs + MAGNET_CENTER_FREEZE_MS
      setButtonSize((size) => {
        const nextSize = Math.min(roundRules.initialButtonSize, size + 6)
        centerButton(nextSize)
        return nextSize
      })
      setTargetSpawnSequence((sequence) => sequence + 1)
      addCenterFeedback("Center", "power power-magnet_center")
    } else if (powerup.effectType === "combo_surge") {
      addCenterFeedback("Surge", "power power-combo_surge")
    } else if (powerup.effectType === "guard_charge") {
      addCenterFeedback("Guard", "power power-guard_charge")
    } else if (powerup.effectType === "second_wind") {
      addCenterFeedback("Second Wind", "power power-second_wind")
    } else if (powerup.effectType === "size_lock") {
      sizeLockUntilRef.current = eventTimeMs + SIZE_LOCK_DURATION_MS
      addCenterFeedback("Locked", "power power-size_lock")
    } else if (powerup.effectType === "overclock") {
      addCenterFeedback("Overclock", "power power-overclock")
    }
  }, [addCenterFeedback, centerButton, roundRules.initialButtonSize, roundRules.maxTimeBufferSeconds])

  const handleUsePowerup = useCallback((powerupId) => {
    if (!isPlaying || !simulationRef.current) return
    const powerup = roundRules.equippedPowerups.find((item) => item.id === powerupId)
    if (!powerup) return

    const eventTimeMs = getElapsedMs()
    const outcome = simulationRef.current.applyPowerup(powerup.id, eventTimeMs)
    if (!outcome.applied) {
      if (outcome.reason === "untimed_round") addCenterFeedback("No Timer", "negative")
      return
    }

    setPowerupCharges(outcome.powerupCharges)
    setComboSurgeHitsRemaining(outcome.comboSurgeHitsRemaining)
    setGuardActiveUntilMs(outcome.guardActiveUntilMs)
    setActivatedPowerup({ id: powerup.id, label: powerup.label, sequence: eventTimeMs })
    if (activationCueTimeoutRef.current) window.clearTimeout(activationCueTimeoutRef.current)
    activationCueTimeoutRef.current = window.setTimeout(() => {
      setActivatedPowerup(null)
      activationCueTimeoutRef.current = null
    }, 1100)
    applyPowerupPresentation(powerup, eventTimeMs)
  }, [addCenterFeedback, applyPowerupPresentation, getElapsedMs, isPlaying, roundRules.equippedPowerups])

  // Guard expiry mirrors the engine's elapsed-ms timebase.
  useEffect(() => {
    if (guardActiveUntilMs <= 0) return undefined
    const remainingMs = Math.max(0, guardActiveUntilMs - getElapsedMs())
    const timeoutId = window.setTimeout(() => setGuardActiveUntilMs(0), remainingMs)
    return () => window.clearTimeout(timeoutId)
  }, [getElapsedMs, guardActiveUntilMs])

  // Keyboard: 1/2/3 fire tools; DEV `g` ends the sample early (parity with /game).
  useEffect(() => {
    if (!isActive) return undefined

    function handleKeyDown(event) {
      if (event.repeat) return
      if (import.meta.env.DEV && event.key.toLowerCase() === "g" && isPlaying) {
        setTimeLeft(0)
        endRound()
        return
      }
      if (event.key === "Escape") {
        onExit?.()
        return
      }
      const powerup = roundRules.equippedPowerups.find((item) => item.slotKey === event.key)
      if (powerup) handleUsePowerup(powerup.id)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [endRound, handleUsePowerup, isActive, isPlaying, onExit, roundRules.equippedPowerups])

  useEffect(() => () => {
    clearFeedbackTimeouts()
    if (endTimeoutRef.current) window.clearTimeout(endTimeoutRef.current)
    if (activationCueTimeoutRef.current) window.clearTimeout(activationCueTimeoutRef.current)
  }, [clearFeedbackTimeouts])

  const comboMultiplier = getComboMultiplier(streak, roundRules.comboStep)
  const isGuardActive = guardActiveUntilMs > 0

  const powerupSlots = useMemo(() => (
    roundRules.equippedPowerups.map((powerup) => ({
      ...powerup,
      charges: powerupCharges[powerup.id] ?? 0,
      comboSurgeHitsRemaining,
      isGuardActive,
    }))
  ), [comboSurgeHitsRemaining, isGuardActive, powerupCharges, roundRules.equippedPowerups])

  return {
    phase,
    countdownValue,
    isPlaying,
    timeLeft,
    score,
    streak,
    bestStreak,
    hits,
    misses,
    chargesEarned,
    comboMultiplier,
    results: { score, hits, misses, bestStreak, chargesEarned },
    endRound,
    arenaProps: {
      arenaRef,
      onArenaClick: handleArenaClick,
      buttonStyle: {
        width: `${buttonSize}px`,
        height: `${buttonSize}px`,
        left: `${buttonPosition.x}px`,
        top: `${buttonPosition.y}px`,
      },
      onButtonClick: handleButtonClick,
      isButtonDisabled: !isPlaying,
      buttonLabel: getButtonLabel(buttonSize),
      buttonLabelFontSize: getButtonLabelFontSize(buttonSize),
      clickFeedbackItems,
      targetSpawnSequence,
      isTargetVisible: phase === RANGE_PHASE.PLAYING,
    },
    powerupTrayProps: {
      powerupSlots,
      streak,
      isPlaying,
      activatedPowerup,
      onUsePowerup: handleUsePowerup,
    },
    isTimedRoundForPowers,
  }
}
