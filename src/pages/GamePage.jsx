import { AnimatePresence, motion } from "motion/react"
import { ROUND_PHASE } from "../constants/gameConstants.js"
import GameArena from "../features/game/components/GameArena.jsx"
import GameHud from "../features/game/components/GameHud.jsx"
import PowerupTray from "../features/game/components/PowerupTray.jsx"
import { CountdownOverlay, GameOverOverlay, ReadyOverlay } from "../features/game/components/RoundOverlaysBarrel.jsx"
import { useGameScreenController } from "../features/game/hooks/useGameScreenController.js"

const MotionDiv = motion.div

// Stage enters slowly (backdrop fades in as the round ends), exits fast (round is starting).
const stageVariants = {
  hidden: { opacity: 0, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } },
  visible: { opacity: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
}

export default function GamePage(props) {
  const game = useGameScreenController(props)
  let activeOverlay = null

  if (game.phase === ROUND_PHASE.READY) {
    activeOverlay = <ReadyOverlay key="ready-overlay" {...game.readyOverlayProps} />
  } else if (game.phase === ROUND_PHASE.COUNTDOWN) {
    activeOverlay = <CountdownOverlay key="countdown-overlay" {...game.countdownOverlayProps} />
  } else if (game.phase === ROUND_PHASE.GAME_OVER) {
    activeOverlay = <GameOverOverlay key="game-over-overlay" {...game.gameOverOverlayProps} />
  }

  return (
    <div className={game.gameScreenClassName}>
      <GameHud {...game.hudProps} />

      <GameArena {...game.arenaProps} />

      <PowerupTray {...game.powerupTrayProps} />

      <AnimatePresence>
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
