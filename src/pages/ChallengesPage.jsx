import {
  ArrowRight,
  ChatTeardropText,
  Check,
  Crosshair,
  Ghost,
  PaperPlaneTilt,
  Play,
  UserFocus,
  X,
} from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { CommandHeader } from "../components/RouteScene.jsx"
import PlayerPortrait from "../components/art/PlayerPortrait.jsx"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"
import { useActionFeedback } from "../hooks/useActionFeedback.js"
import { getModeLabel } from "../utils/gameModeLabelsAndRankedFilters.js"
import {
  fetchChallenges,
  fetchUserReplays,
  respondToChallenge,
  sendChallenge,
} from "../services/clickAwayHttpApiClient.js"

function formatTimestamp(value) {
  if (!value) return "Unknown"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Unknown"
  const elapsedMs = Date.now() - parsed.getTime()
  const minutes = Math.round(elapsedMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return parsed.toLocaleDateString()
}

function ChallengeStatusBadge({ status = "pending" }) {
  const icon = status === "accepted"
    ? <Check weight="bold" />
    : status === "completed"
      ? <Crosshair weight="bold" />
      : status === "declined" || status === "expired"
        ? <X weight="bold" />
        : <Ghost weight="bold" />

  return (
    <span className={`challengeStatusBadge is-${status}`}>
      <span aria-hidden="true">{icon}</span>
      {status}
    </span>
  )
}

function ChallengeCard({
  challenge,
  currentUserId,
  currentUsername,
  onRespond,
  onRaceGhost,
  isResponding = false,
}) {
  const isIncoming = challenge.opponentUserId === currentUserId
  const opponentLabel = isIncoming
    ? challenge.challengerUsername
    : challenge.opponentUsername

  return (
    <article className="challengeCard" data-status={challenge.status}>
      <div className="challengeVersus" aria-hidden="true">
        <span className="challengeVersusSide isYou"><PlayerPortrait name={currentUsername} size={52} /></span>
        <span className="challengeVersusBadge">VS</span>
        <span className="challengeVersusSide isRival"><PlayerPortrait name={opponentLabel || "Rival"} size={52} /></span>
      </div>
      <span className="challengeTicketPrint" aria-hidden="true">
        <b>Ghost duel · admit two</b>
        <i>No. {String(challenge.id ?? "0").replace(/\D/g, "").padStart(6, "0").slice(-6)}</i>
        <em>{getModeLabel({ modeId: challenge.modeId, fallback: challenge.modeId })} rules</em>
      </span>
      <div className="challengeCardHeader">
        <div className="challengeRivalIdentity">
          <span className="challengeRivalCrest" aria-hidden="true">
            <PlayerPortrait name={opponentLabel || "Rival"} size={44} />
          </span>
          <div>
            <p className="leaderboardSectionEyebrow">
              {isIncoming ? "Incoming Challenge" : "Sent Challenge"}
            </p>
            <h2 className="cardH2 challengeCardTitle">vs {opponentLabel}</h2>
          </div>
        </div>
        <ChallengeStatusBadge status={challenge.status} />
      </div>

      <div
        className="challengeTargetLine"
        aria-label={`${challenge.modeId} target score ${Number(challenge.replayScore || 0).toLocaleString()}`}
      >
        <span className="challengeTargetMode">{getModeLabel({ modeId: challenge.modeId, fallback: challenge.modeId })}</span>
        <span className="challengeTargetBeam" aria-hidden="true"><i /></span>
        <span className="challengeTargetScore">
          <small>Beat</small>
          <strong>{Number(challenge.replayScore || 0).toLocaleString()}</strong>
        </span>
      </div>

      {challenge.message ? <p className="challengeCardMessage">“{challenge.message}”</p> : null}
      <p className="muted challengeCardTimestamp">Sent {formatTimestamp(challenge.createdAt)}</p>

      {challenge.status === "completed" ? (
        <p className="challengeCardResult">
          {challenge.challengerWon
            ? `${challenge.challengerUsername} won the ghost duel`
            : `${challenge.opponentUsername} won the ghost duel`}
          {" · "}
          {Number(challenge.replayScore || 0).toLocaleString()}
          {" vs "}
          {Number(challenge.opponentReplayScore || 0).toLocaleString()}
        </p>
      ) : null}

      <div className="challengeCardActions">
        {isIncoming && challenge.status === "pending" ? (
          <>
            <button
              type="button"
              className="primaryButton"
              disabled={isResponding}
              onClick={(event) => onRespond(challenge.id, "accept", event.currentTarget)}
            >
              <Check weight="bold" aria-hidden="true" /> Accept
            </button>
            <button
              type="button"
              className="secondaryButton"
              disabled={isResponding}
              onClick={(event) => onRespond(challenge.id, "decline", event.currentTarget)}
            >
              <X weight="bold" aria-hidden="true" /> Decline
            </button>
          </>
        ) : null}

        {isIncoming && challenge.status === "accepted" ? (
          <button type="button" className="primaryButton" onClick={() => onRaceGhost(challenge)}>
            <Play weight="fill" aria-hidden="true" /> Race Ghost
          </button>
        ) : null}
      </div>
    </article>
  )
}

export default function ChallengesPage({ currentUserId = "", currentUsername = "Player" }) {
  const navigate = useNavigate()
  const { signalAction } = useActionFeedback()
  const [challenges, setChallenges] = useState([])
  const [replays, setReplays] = useState([])
  const [filter, setFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [respondingChallengeId, setRespondingChallengeId] = useState(null)
  const [sendForm, setSendForm] = useState({ opponentUsername: "", replayId: "", message: "" })
  const [sendError, setSendError] = useState("")
  const [sendSuccess, setSendSuccess] = useState("")
  const [isSending, setIsSending] = useState(false)

  const loadChallenges = useCallback(async () => {
    setIsLoading(true)
    setLoadError("")
    try {
      const [challengeResponse, replayResponse] = await Promise.all([
        fetchChallenges({ role: filter === "all" ? "all" : filter }),
        fetchUserReplays({ limit: 10 }),
      ])
      setChallenges(Array.isArray(challengeResponse?.challenges) ? challengeResponse.challenges : [])
      setReplays(Array.isArray(replayResponse?.replays) ? replayResponse.replays : [])
      return true
    } catch (error) {
      setChallenges([])
      setReplays([])
      setLoadError(error.message || "Unable to load challenges.")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadChallenges()
  }, [loadChallenges])

  const pendingIncomingCount = useMemo(
    () => challenges.filter(
      (challenge) => challenge.opponentUserId === currentUserId && challenge.status === "pending"
    ).length,
    [challenges, currentUserId]
  )

  const selectedReplay = useMemo(
    () => replays.find((replay) => String(replay.id) === String(sendForm.replayId)) ?? null,
    [replays, sendForm.replayId]
  )
  const launchReady = Boolean(sendForm.opponentUsername.trim() && selectedReplay)

  async function handleRespond(challengeId, action, source) {
    setRespondingChallengeId(challengeId)
    signalAction(source, { state: "pending", silent: true })
    try {
      await respondToChallenge(challengeId, action)
      await loadChallenges()
      signalAction(source, {
        eventName: FEEDBACK_EVENTS.ACTION_CONFIRM,
        eventId: `duel-${action}-${challengeId}`,
      })
    } catch (error) {
      setLoadError(error.message || "Unable to update challenge.")
      signalAction(source, { state: "denied", eventName: FEEDBACK_EVENTS.ACTION_DENY })
    } finally {
      setRespondingChallengeId(null)
    }
  }

  function handleRaceGhost(challenge) {
    navigate(`/game?challengeId=${challenge.id}&replayId=${challenge.replayId}`)
  }

  async function handleSendChallenge(event) {
    event.preventDefault()
    const source = event.nativeEvent?.submitter ?? event.currentTarget
    setSendError("")
    setSendSuccess("")
    setIsSending(true)
    signalAction(source, { state: "pending", silent: true })

    try {
      const opponentUsername = sendForm.opponentUsername.trim()
      await sendChallenge({
        opponentUsername,
        replayId: Number(sendForm.replayId),
        message: sendForm.message.trim(),
      })
      setSendSuccess(opponentUsername)
      setSendForm({ opponentUsername: "", replayId: "", message: "" })
      await loadChallenges()
      signalAction(source, {
        eventName: FEEDBACK_EVENTS.DUEL_LAUNCH,
        eventId: `duel-launch-${opponentUsername}`,
      })
    } catch (error) {
      setSendError(error.message || "Unable to send challenge.")
      signalAction(source, { state: "denied", eventName: FEEDBACK_EVENTS.ACTION_DENY })
    } finally {
      setIsSending(false)
    }
  }

  const rivalName = sendForm.opponentUsername.trim()
  return (
    <div className="duelPage pageCenter">
      <section className="duelCommandSurface">
        <CommandHeader
          routeId="duels"
          eyebrow="Ghost network"
          title="Duel command"
          subtitle="Lock a rival. Choose your run. Put a score on the line."
          status={pendingIncomingCount > 0 ? null : (
            <span className="duelNetworkStatus"><i /> Network clear</span>
          )}
        />


        <section className="duelInbox" aria-labelledby="duel-inbox-title">
          <div className="duelInboxHeader">
            <div>
              <p className="commandHeaderEyebrow">Rival radar</p>
              <h2 id="duel-inbox-title">Duel signals</h2>
            </div>
            <div className="challengeFilterRow" role="tablist" aria-label="Challenge filters">
              {[
                { id: "all", label: "All", icon: <Crosshair /> },
                { id: "incoming", label: pendingIncomingCount > 0 ? `Incoming · ${pendingIncomingCount}` : "Incoming", icon: <Ghost /> },
                { id: "outgoing", label: "Sent", icon: <PaperPlaneTilt /> },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === option.id}
                  className={`leaderboardBoardTab${filter === option.id ? " isActive" : ""}`}
                  onClick={(event) => {
                    setFilter(option.id)
                    signalAction(event.currentTarget, {
                      eventName: FEEDBACK_EVENTS.FILTER,
                      eventId: `duel-filter-${option.id}`,
                    })
                  }}
                >
                  <span aria-hidden="true">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="duelRadarState isLoading" aria-live="polite">
              <span className="duelRadar" aria-hidden="true"><i /><i /><i /></span>
              <strong>Scanning rival channels</strong>
            </div>
          ) : null}

          {!isLoading && loadError ? (
            <div className="duelRadarState isError" role="alert">
              <span className="duelRadar" aria-hidden="true"><X weight="bold" /></span>
              <strong>Rival network unavailable</strong>
              <p>{loadError}</p>
              <button
                type="button"
                className="leaderboardRetryButton"
                onClick={async (event) => {
                  const source = event.currentTarget
                  signalAction(source, { state: "pending", eventName: FEEDBACK_EVENTS.RETRY })
                  const succeeded = await loadChallenges()
                  signalAction(source, {
                    state: succeeded ? "confirmed" : "denied",
                    eventName: succeeded ? FEEDBACK_EVENTS.ACTION_CONFIRM : FEEDBACK_EVENTS.ACTION_DENY,
                  })
                }}
              >Retry scan</button>
            </div>
          ) : null}

          {!isLoading && !loadError && challenges.length === 0 ? (
            <div className="duelRadarState" role="status">
              <span className="duelRadar" aria-hidden="true"><i /><i /><i /></span>
              <strong>No rival signals</strong>
              <p>Your radar is clear. Launch a replay above to start a rivalry.</p>
            </div>
          ) : null}

          <div className="challengeList">
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                onRespond={handleRespond}
                onRaceGhost={handleRaceGhost}
                isResponding={respondingChallengeId === challenge.id}
              />
            ))}
          </div>
        </section>

        <section className="duelComposer duelFightComposer" aria-labelledby="duel-composer-title">
          <form className="duelLaunchForm" onSubmit={handleSendChallenge}>
            <h2 className="uiVisuallyHidden" id="duel-composer-title">Create a ghost duel</h2>

            <div className="duelFightCard">
              <div className="duelFighter is-player">
                <span className="duelFighterPortrait" aria-hidden="true"><PlayerPortrait name={currentUsername} size={112} /></span>
                <span className="duelFighterPlate"><small>Challenger</small><strong>{currentUsername || "You"}</strong></span>
              </div>

              <div className="duelFightCenter">
                <b className="duelVsMark" aria-hidden="true">VS</b>
                <div className={`duelReplayLock ${selectedReplay ? "isLocked" : ""}`}>
                  <small>{selectedReplay ? getModeLabel({ modeId: selectedReplay.modeId, fallback: selectedReplay.modeId }) : "Score to beat"}</small>
                  <strong>{selectedReplay ? Number(selectedReplay.score || 0).toLocaleString() : "?"}</strong>
                  {selectedReplay ? <span>on the line</span> : null}
                </div>
              </div>

              <label className={`duelFighter is-rival ${rivalName ? "isLocked" : ""}`}>
                <span className="duelFighterPortrait" aria-hidden="true">
                  {rivalName ? <PlayerPortrait name={rivalName} size={112} /> : <span className="duelFighterUnknown">?</span>}
                </span>
                <span className="duelFighterPlate duelRivalInput">
                  <small>Rival</small>
                  <input
                    type="text"
                    value={sendForm.opponentUsername}
                    onChange={(event) => {
                      setSendSuccess("")
                      setSendForm((current) => ({ ...current, opponentUsername: event.target.value }))
                    }}
                    placeholder="Enter username"
                    aria-label="Opponent username"
                    required
                  />
                </span>
              </label>
            </div>

            <fieldset className="duelRunTokens">
              <legend>Stake a run</legend>
              {replays.length > 0 ? (
                <div className="duelReplayRail" role="radiogroup" aria-label="Choose a replay">
                  {replays.map((replay) => {
                    const isSelected = String(replay.id) === String(sendForm.replayId)
                    return (
                      <button
                        key={replay.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`duelReplayCard ${isSelected ? "isSelected" : ""}`}
                        data-mode={String(replay.modeId || "").toLowerCase()}
                        onClick={(event) => {
                          setSendSuccess("")
                          setSendForm((current) => ({ ...current, replayId: String(replay.id) }))
                          signalAction(event.currentTarget, {
                            eventName: FEEDBACK_EVENTS.SELECTION,
                            eventId: `duel-replay-${replay.id}`,
                          })
                        }}
                      >
                        <span className="duelReplayMode">{getModeLabel({ modeId: replay.modeId, fallback: replay.modeId })}</span>
                        <strong>{Number(replay.score || 0).toLocaleString()}</strong>
                        <span className="uiVisuallyHidden"> Score</span>
                        {isSelected ? <Check className="duelReplayCheck" weight="bold" /> : null}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <button type="button" className="duelNoReplay" onClick={() => navigate("/game")}>
                  <Play weight="fill" aria-hidden="true" />
                  <span><strong>Record a run</strong><small>Finish a round to create a challenge replay.</small></span>
                  <ArrowRight weight="bold" aria-hidden="true" />
                </button>
              )}
            </fieldset>

            <div className="duelLaunchStep">
              <label className="duelMessageField duelTaunt gfField hasCap">
                <span className="gfFieldCap" aria-hidden="true"><ChatTeardropText weight="fill" /></span>
                <span className="uiVisuallyHidden">Message (optional)</span>
                <input
                  type="text"
                  maxLength={280}
                  value={sendForm.message}
                  onChange={(event) => setSendForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Add a taunt (optional)"
                />
              </label>
              <button type="submit" className="duelLaunchButton" disabled={isSending || !launchReady}>
                <PaperPlaneTilt weight="fill" aria-hidden="true" />
                <span>{isSending ? "Transmitting" : "Send duel"}</span>
                <ArrowRight weight="bold" aria-hidden="true" />
              </button>
            </div>

            {!launchReady && !sendSuccess ? (
              <p className="duelLaunchHint">
                {sendForm.opponentUsername.trim() ? "Choose a run to send the duel." : "Pick a rival and a run to send the duel."}
              </p>
            ) : null}
            {sendError ? <p className="formError duelFormSignal" role="alert">{sendError}</p> : null}
            {sendSuccess ? (
              <p className="duelFormSignal isSuccess" role="status">
                <Check weight="bold" aria-hidden="true" /> Duel transmitted to {sendSuccess}
              </p>
            ) : null}
          </form>
        </section>
      </section>
    </div>
  )
}
