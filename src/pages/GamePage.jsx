import { AnimatePresence, motion } from "motion/react"
import { useEffect, useLayoutEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { ROUND_PHASE } from "../constants/gameConstants.js"
import { useFeedbackPreferences } from "../app/useFeedbackPreferences.js"
import GameArena from "../features/game/components/GameArena.jsx"
import GameHud from "../features/game/components/GameHud.jsx"
import PowerupTray from "../features/game/components/PowerupTray.jsx"
import { CountdownOverlay, GameOverFlow, ReadyOverlay } from "../features/game/components/gameRoundOverlayExports.jsx"
import { useGameScreenController } from "../features/game/hooks/useGameScreenController.js"
import { fetchReplay } from "../services/clickAwayHttpApiClient.js"
import { isValidGhostReplay, normalizeReplayRecord } from "../utils/replayUtils.js"

const MotionDiv = motion.div

// Stage enters slowly (backdrop fades in as the round ends), exits fast (round is starting).
const stageVariants = {
  hidden: { opacity: 0, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } },
  visible: { opacity: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
}

export default function GamePage({ onPhaseChange, ...props }) {
  const {
    effectivePreferences,
    emitFeedback,
    stopFeedback,
  } = useFeedbackPreferences()
  const [searchParams, setSearchParams] = useSearchParams()
  const challengeId = Number(searchParams.get("challengeId")) || null
  const replayId = Number(searchParams.get("replayId")) || null
  const [ghostLoadAttempt, setGhostLoadAttempt] = useState(0)
  const [loadState, setLoadState] = useState({
    replayId: null,
    replay: null,
    error: "",
  })

  useEffect(() => {
    if (!replayId) {
      return undefined
    }

    let isCancelled = false

    async function loadGhostReplay() {
      setLoadState({ replayId, replay: null, error: "" })

      try {
        const response = await fetchReplay(replayId)
        if (isCancelled) return
        if (!isValidGhostReplay(response?.replay)) throw new Error("Unable to load a valid ghost replay. Please retry.")
        setLoadState({
          replayId,
          replay: normalizeReplayRecord(response.replay),
          error: "",
        })
      } catch (error) {
        if (isCancelled) return
        setLoadState({
          replayId,
          replay: null,
          error: error.message || "Unable to load ghost replay.",
        })
      }
    }

    loadGhostReplay()

    return () => {
      isCancelled = true
    }
  }, [replayId, ghostLoadAttempt])

  const ghostReplay = loadState.replayId === replayId ? loadState.replay : null
  const ghostLoadError = loadState.replayId === replayId ? loadState.error : ""

  const game = useGameScreenController({
    ...props,
    ghostReplay,
    challengeId,
    autoStartGhostDuel: Boolean(replayId && challengeId && isValidGhostReplay(ghostReplay)),
    onExitDuel: () => setSearchParams({}, { replace: true }),
    emitFeedback,
    allowScreenShake: effectivePreferences.screenShake,
  })

  useLayoutEffect(() => {
    onPhaseChange?.(game.phase)
  }, [game.phase, onPhaseChange])

  useEffect(() => () => {
    onPhaseChange?.(ROUND_PHASE.READY)
  }, [onPhaseChange])

  useEffect(() => () => {
    stopFeedback()
  }, [game.phase, stopFeedback])

  const duelError = (challengeId && !replayId ? "This duel link is missing its rival run." : "")
    || ghostLoadError || game.duelStartError
  let activeOverlay = null
  const entranceOverlay = game.entranceOverlayProps
    ? <CountdownOverlay key="round-entrance" {...game.entranceOverlayProps} />
    : null

  if (game.phase === ROUND_PHASE.READY && !entranceOverlay) {
    activeOverlay = (
      <ReadyOverlay
        key="ready-overlay"
        {...game.readyOverlayProps}
        targetPreview={{
          skinClass: game.arenaProps.buttonSkinClass,
          imageSrc: game.arenaProps.buttonSkinImageSrc,
          imageScale: game.arenaProps.buttonSkinImageScale,
          arenaThemeClass: game.arenaProps.arenaThemeClass,
        }}
      />
    )
  } else if (game.phase === ROUND_PHASE.GAME_OVER) {
    activeOverlay = <GameOverFlow key="game-over-flow" {...game.gameOverOverlayProps} />
  }

  return (
    <div className={game.gameScreenClassName}>
      {duelError ? (
        <div className="ghostDuelError" role="alert">
          {duelError}
          {replayId ? <button type="button" onClick={() => setGhostLoadAttempt((attempt) => attempt + 1)}>Retry ghost</button> : null}
          <button type="button" onClick={() => {
            game.entranceOverlayProps?.onCancel?.()
            setSearchParams({}, { replace: true })
          }}>Leave duel</button>
        </div>
      ) : challengeId && replayId && !ghostReplay ? (
        <div className="ghostDuelError" role="status">Loading your rival's run…</div>
      ) : null}

      <GameHud {...game.hudProps} />

      <GameArena {...game.arenaProps} roundOverlay={entranceOverlay} />

      <PowerupTray {...game.powerupTrayProps} />

      <AnimatePresence initial={false}>
        {activeOverlay ? (
          <MotionDiv
            key="overlay-stage"
            className="gameOverlay gameOverlayStage"
            variants={stageVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <AnimatePresence mode="wait">
              {activeOverlay}
            </AnimatePresence>
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
