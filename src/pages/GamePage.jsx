import { ROUND_PHASE } from "../constants/gameConstants.js"
import GameArena from "../features/game/components/GameArena.jsx"
import GameHud from "../features/game/components/GameHud.jsx"
import PowerupTray from "../features/game/components/PowerupTray.jsx"
import { CountdownOverlay, GameOverOverlay, ReadyOverlay } from "../features/game/components/RoundOverlaysBarrel.jsx"
import { useGameScreenController } from "../features/game/hooks/useGameScreenController.js"

export default function GamePage(props) {
  const game = useGameScreenController(props)

  return (
    <div className={game.gameScreenClassName}>
      <GameHud {...game.hudProps} />

      <GameArena {...game.arenaProps} />

      <PowerupTray {...game.powerupTrayProps} />

      {game.phase === ROUND_PHASE.READY ? (
        <ReadyOverlay {...game.readyOverlayProps} />
      ) : null}

      {game.phase === ROUND_PHASE.COUNTDOWN ? (
        <CountdownOverlay {...game.countdownOverlayProps} />
      ) : null}

      {game.phase === ROUND_PHASE.GAME_OVER ? (
        <GameOverOverlay {...game.gameOverOverlayProps} />
      ) : null}
    </div>
  )
}
