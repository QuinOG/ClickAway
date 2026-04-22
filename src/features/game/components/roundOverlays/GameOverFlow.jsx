import { AnimatePresence, motion } from "motion/react"
import { useMemo, useState } from "react"
import { usePrefersReducedMotion } from "./useOverlayMotion.js"
import { GameOverOverlay } from "./GameOverOverlay.jsx"
import PromotionModal from "./PromotionModal.jsx"
import RewardsModal from "./RewardsModal.jsx"

const MotionDiv = motion.div

const OVERLAY_EASE = [0.22, 1, 0.36, 1]

// The flow overlay fades as a backdrop. Each phase's card handles its own spring.
function getFlowVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
      exit: { opacity: 1 },
    }
  }

  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.22, ease: OVERLAY_EASE } },
    exit: { opacity: 0, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } },
  }
}

export function GameOverFlow({
  score,
  hits,
  misses,
  bestStreak,
  accuracy,
  modeLabel,
  playerLevel = 1,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  roundXpEarned = 0,
  roundCoinsEarned = 0,
  allowsCoinRewards = false,
  allowsLevelProgression = false,
  previousRankProgress = {},
  projectedRankProgress = {},
  roundRankDelta = 0,
  allowsRankProgression = false,
  selectedModeId,
  bestScore = 0,
  avgReactionMs = null,
  bestReactionMs = null,
  loadoutSnapshot = null,
  loadoutPresentation = null,
  onRematch,
  onPlayAgain,
  onChooseMode,
  achievementStats = {},
  unlockedAchievementIds = [],
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const flowVariants = useMemo(() => getFlowVariants(prefersReducedMotion), [prefersReducedMotion])

  const currentRankLabel = previousRankProgress?.tierLabel || "Unranked"
  const projectedRankLabel = projectedRankProgress?.tierLabel || "Unranked"

  const isPlacementReveal = Boolean(
    allowsRankProgression &&
    previousRankProgress?.isPlacement &&
    !projectedRankProgress?.isPlacement &&
    !projectedRankProgress?.isUnranked
  )
  const isPromotion = Boolean(
    allowsRankProgression &&
    !previousRankProgress?.isPlacement &&
    !projectedRankProgress?.isPlacement &&
    projectedRankProgress?.rankOrder > previousRankProgress?.rankOrder
  )

  const showPromotion = isPromotion || isPlacementReveal
  const showRewards = allowsCoinRewards || allowsLevelProgression || allowsRankProgression

  const [flowPhase] = useState(() => {
    if (showPromotion) return "promotion"
    if (showRewards) return "rewards"
    return "summary"
  })
  const [activePhase, setActivePhase] = useState(flowPhase)

  const advanceTo = (phase) => () => setActivePhase(phase)

  const summaryProps = {
    score,
    hits,
    misses,
    bestStreak,
    accuracy,
    modeLabel,
    allowsCoinRewards,
    allowsLevelProgression,
    allowsRankProgression,
    selectedModeId,
    bestScore,
    avgReactionMs,
    bestReactionMs,
    loadoutSnapshot,
    loadoutPresentation,
    onRematch,
    onPlayAgain,
    onChooseMode,
    achievementStats,
    unlockedAchievementIds,
  }

  return (
    <MotionDiv
      className="gameOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={
        activePhase === "promotion"
          ? "promotion-modal-title"
          : activePhase === "rewards"
          ? "rewards-modal-title"
          : "game-over-title"
      }
      variants={flowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ padding: "16px", overflow: "auto" }}
    >
      <AnimatePresence mode="wait">
        {activePhase === "promotion" && (
          <PromotionModal
            key="promotion"
            isPlacementReveal={isPlacementReveal}
            currentRankLabel={currentRankLabel}
            projectedRankLabel={projectedRankLabel}
            onContinue={advanceTo(showRewards ? "rewards" : "summary")}
          />
        )}

        {activePhase === "rewards" && (
          <RewardsModal
            key="rewards"
            allowsLevelProgression={allowsLevelProgression}
            allowsCoinRewards={allowsCoinRewards}
            allowsRankProgression={allowsRankProgression}
            playerLevel={playerLevel}
            playerXpIntoLevel={playerXpIntoLevel}
            playerXpToNextLevel={playerXpToNextLevel}
            roundXpEarned={roundXpEarned}
            roundCoinsEarned={roundCoinsEarned}
            roundRankDelta={roundRankDelta}
            previousRankProgress={previousRankProgress}
            projectedRankProgress={projectedRankProgress}
            projectedRankLabel={projectedRankLabel}
            isPlacementReveal={isPlacementReveal}
            onContinue={advanceTo("summary")}
          />
        )}

        {activePhase === "summary" && (
          <GameOverOverlay key="summary" {...summaryProps} />
        )}
      </AnimatePresence>
    </MotionDiv>
  )
}
