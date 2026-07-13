import {
  ArrowRight,
  Check,
  Crosshair,
  Ghost,
  PaperPlaneTilt,
  Play,
  Sword,
  UserFocus,
  X,
} from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { CommandHeader } from "../components/RouteScene.jsx"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"
import { useActionFeedback } from "../hooks/useActionFeedback.js"
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
  return parsed.toLocaleString()
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
      <div className="challengeCardHeader">
        <div className="challengeRivalIdentity">
          <span className="challengeRivalCrest" aria-hidden="true">
            {opponentLabel?.charAt(0)?.toUpperCase() || "?"}
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
        <span className="challengeTargetMode">{challenge.modeId}</span>
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

export default function ChallengesPage({ currentUserId = "" }) {
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

  return (
    <div className="duelPage pageCenter">
      <section className="duelCommandSurface">
        <CommandHeader
          routeId="duels"
          eyebrow="Ghost network"
          title="Duel command"
          subtitle="Lock a rival. Choose your run. Put a score on the line."
          status={pendingIncomingCount > 0 ? (
            <span className="challengePendingBadge">
              <Ghost weight="fill" aria-hidden="true" /> {pendingIncomingCount} incoming
            </span>
          ) : (
            <span className="duelNetworkStatus"><i /> Network clear</span>
          )}
        />

        <section className="duelComposer" aria-labelledby="duel-composer-title">
          <div className="duelVersusStage" aria-hidden="true">
            <div className="duelCombatant is-player">
              <span className="duelCombatantCrest"><UserFocus weight="duotone" /></span>
              <small>You</small>
            </div>
            <div className="duelSignalLine">
              <span />
              <Sword weight="fill" />
              <span />
            </div>
            <div className={`duelCombatant is-rival ${sendForm.opponentUsername.trim() ? "isLocked" : ""}`}>
              <span className="duelCombatantCrest">
                {sendForm.opponentUsername.trim()
                  ? sendForm.opponentUsername.trim().charAt(0).toUpperCase()
                  : <Crosshair weight="duotone" />}
              </span>
              <small>{sendForm.opponentUsername.trim() || "Rival"}</small>
            </div>
            <div className={`duelReplayLock ${selectedReplay ? "isLocked" : ""}`}>
              <small>{selectedReplay?.modeId ?? "Replay signal"}</small>
              <strong>{selectedReplay ? Number(selectedReplay.score || 0).toLocaleString() : "—"}</strong>
              <span>{selectedReplay ? "score to defend" : "select a run"}</span>
            </div>
          </div>

          <form className="duelLaunchForm" onSubmit={handleSendChallenge}>
            <h2 className="uiVisuallyHidden" id="duel-composer-title">Create a ghost duel</h2>

            <label className="duelStep duelRivalStep">
              <span className="duelStepNumber">01</span>
              <span className="duelStepCopy"><strong>Lock rival</strong><small>Player signal</small></span>
              <span className="duelInputWrap">
                <UserFocus weight="duotone" aria-hidden="true" />
                <input
                  type="text"
                  value={sendForm.opponentUsername}
                  onChange={(event) => {
                    setSendSuccess("")
                    setSendForm((current) => ({ ...current, opponentUsername: event.target.value }))
                  }}
                  placeholder="Opponent username"
                  required
                />
                {sendForm.opponentUsername.trim() ? <Check weight="bold" aria-hidden="true" /> : null}
              </span>
            </label>

            <fieldset className="duelStep duelReplayStep">
              <legend>
                <span className="duelStepNumber">02</span>
                <span className="duelStepCopy"><strong>Arm replay</strong><small>Score they must beat</small></span>
              </legend>
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
                        onClick={(event) => {
                          setSendSuccess("")
                          setSendForm((current) => ({ ...current, replayId: String(replay.id) }))
                          signalAction(event.currentTarget, {
                            eventName: FEEDBACK_EVENTS.SELECTION,
                            eventId: `duel-replay-${replay.id}`,
                          })
                        }}
                      >
                        <span className="duelReplayMode">{replay.modeId}</span>
                        <strong>{Number(replay.score || 0).toLocaleString()}</strong>
                        <span className="duelReplayMeta"><Crosshair weight="bold" /> Score</span>
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

            <div className="duelStep duelLaunchStep">
              <span className="duelStepNumber">03</span>
              <label className="duelMessageField">
                <span className="duelStepCopy"><strong>Launch</strong><small>Optional transmission</small></span>
                <input
                  type="text"
                  maxLength={280}
                  value={sendForm.message}
                  onChange={(event) => setSendForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Think you can beat this run?"
                />
              </label>
              <button type="submit" className="duelLaunchButton" disabled={isSending || !launchReady}>
                <PaperPlaneTilt weight="fill" aria-hidden="true" />
                <span>{isSending ? "Transmitting" : "Send duel"}</span>
                <ArrowRight weight="bold" aria-hidden="true" />
              </button>
            </div>

            {sendError ? <p className="formError duelFormSignal" role="alert">{sendError}</p> : null}
            {sendSuccess ? (
              <p className="duelFormSignal isSuccess" role="status">
                <Check weight="bold" aria-hidden="true" /> Duel transmitted to {sendSuccess}
              </p>
            ) : null}
          </form>
        </section>

        <section className="duelInbox" aria-labelledby="duel-inbox-title">
          <div className="duelInboxHeader">
            <div>
              <p className="commandHeaderEyebrow">Rival radar</p>
              <h2 id="duel-inbox-title">Duel signals</h2>
            </div>
            <div className="challengeFilterRow" role="tablist" aria-label="Challenge filters">
              {[
                { id: "all", label: "All", icon: <Crosshair /> },
                { id: "incoming", label: "Incoming", icon: <Ghost /> },
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
                onRespond={handleRespond}
                onRaceGhost={handleRaceGhost}
                isResponding={respondingChallengeId === challenge.id}
              />
            ))}
          </div>
        </section>
      </section>
    </div>
  )
}
