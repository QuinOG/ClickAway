import { ArrowRight, Check, PaperPlaneTilt, Play } from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

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

const FILTERS = [
  { id: "all", label: "All" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Sent" },
]

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

// How one duel reads from the viewer's side: the rival, which plate it sits on
// and the score line.
function describeDuel(challenge, currentUserId) {
  const isIncoming = challenge.opponentUserId === currentUserId
  const rival = (isIncoming ? challenge.challengerUsername : challenge.opponentUsername) || "Rival"
  const base = {
    isIncoming,
    rival,
    mode: getModeLabel({ modeId: challenge.modeId, fallback: challenge.modeId }),
    score: Number(challenge.replayScore || 0).toLocaleString(),
    scoreLabel: isIncoming ? "to beat" : "your run",
    tone: "idle",
  }
  if (challenge.status === "completed") {
    const won = isIncoming ? !challenge.challengerWon : Boolean(challenge.challengerWon)
    const mine = isIncoming ? challenge.opponentReplayScore : challenge.replayScore
    const theirs = isIncoming ? challenge.replayScore : challenge.opponentReplayScore
    return {
      ...base,
      tone: won ? "won" : "lost",
      score: `${Number(mine || 0).toLocaleString()} - ${Number(theirs || 0).toLocaleString()}`,
      scoreLabel: won ? "You won" : "You lost",
    }
  }
  if (isIncoming && challenge.status === "pending") return { ...base, tone: "incoming" }
  if (challenge.status === "accepted") return { ...base, tone: "accepted" }
  return base
}

function ChallengeCard({ challenge, currentUserId, currentUsername, onRespond, onRaceGhost, isResponding = false }) {
  const duel = describeDuel(challenge, currentUserId)
  const { isIncoming, rival } = duel
  const status = !isIncoming && challenge.status === "pending"
    ? `Waiting for ${rival}`
    : ["accepted", "declined", "expired"].includes(challenge.status) ? challenge.status : ""

  return (
    <article className={`duelRow is-${duel.tone}`} data-status={challenge.status}>
      <div className="duelFace" aria-hidden="true">
        <PlayerPortrait name={currentUsername} size={72} />
        <b>VS</b>
        <PlayerPortrait name={rival} size={72} />
      </div>
      <div className="duelInfo">
        <p className="duelKind">{isIncoming ? "Incoming" : "Sent"} · {duel.mode} · {formatTimestamp(challenge.createdAt)}</p>
        <h3>{rival}</h3>
        {challenge.message ? <p className="duelNote">“{challenge.message}”</p> : null}
      </div>
      <p
        className="duelScore"
        aria-label={`${challenge.modeId} ${challenge.status === "completed" ? "result" : "target score"} ${duel.score}`}
      >
        <strong>{duel.score}</strong>
        <span>{duel.scoreLabel}</span>
      </p>
      <div className="duelAction">
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
              Decline
            </button>
          </>
        ) : null}
        {isIncoming && challenge.status === "accepted" ? (
          <button type="button" className="primaryButton" onClick={() => onRaceGhost(challenge)}>
            <Play weight="fill" aria-hidden="true" /> Race Ghost
          </button>
        ) : <span className="duelStatus">{status}</span>}
      </div>
    </article>
  )
}

// A rival handed over from the Ladder (?rival=name). Names outside the server's
// 3-32 character rule, or your own name, are ignored rather than pre-filled.
function getLadderRival(searchParams, currentUsername) {
  const rival = String(searchParams.get("rival") ?? "").trim()
  if (rival.length < 3 || rival.length > 32) return ""
  if (rival.toLowerCase() === String(currentUsername ?? "").trim().toLowerCase()) return ""
  return rival
}

export default function ChallengesPage({ currentUserId = "", currentUsername = "Player" }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [ladderRival] = useState(() => getLadderRival(searchParams, currentUsername))
  const ladderRivalNoteRef = useRef(null)
  const { signalAction } = useActionFeedback()
  const [challenges, setChallenges] = useState([])
  const [replays, setReplays] = useState([])
  const [filter, setFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [replayLoadError, setReplayLoadError] = useState("")
  const [respondingChallengeId, setRespondingChallengeId] = useState(null)
  const [sendForm, setSendForm] = useState({ opponentUsername: ladderRival, replayId: "", message: "" })
  const [sendError, setSendError] = useState("")
  const [sendSuccess, setSendSuccess] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Only the newest request may update the list (switching filters quickly).
  const requestGenerationRef = useRef(0)
  const loadChallenges = useCallback(async () => {
    const generation = requestGenerationRef.current + 1
    requestGenerationRef.current = generation
    const isCurrent = () => requestGenerationRef.current === generation

    setIsLoading(true)
    setLoadError("")
    setReplayLoadError("")
    try {
      const [challengeResponse, replayResponse] = await Promise.allSettled([
        // Always fetch every role, so the incoming count stays right on any tab.
        fetchChallenges({ role: "all" }),
        fetchUserReplays({ limit: 10 }),
      ])
      if (!isCurrent()) return false
      setChallenges(challengeResponse.status === "fulfilled" && Array.isArray(challengeResponse.value?.challenges)
        ? challengeResponse.value.challenges : [])
      setReplays(replayResponse.status === "fulfilled" && Array.isArray(replayResponse.value?.replays)
        ? replayResponse.value.replays.filter((replay) => replay.visibility !== "private") : [])
      if (challengeResponse.status === "rejected") {
        setLoadError(challengeResponse.reason?.message || "Unable to load challenges.")
      }
      if (replayResponse.status === "rejected") {
        setReplayLoadError(replayResponse.reason?.message || "Unable to load your runs.")
      }
      return challengeResponse.status === "fulfilled"
    } catch (error) {
      if (!isCurrent()) return false
      setChallenges([])
      setReplays([])
      setLoadError(error.message || "Unable to load challenges.")
      return false
    } finally {
      if (isCurrent()) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChallenges()
  }, [loadChallenges])

  // Arriving with a rival: bring the composer into view and confirm the choice,
  // since on phones it sits below the inbox. Runs once the composer has rendered.
  const hasRevealedRivalRef = useRef(false)
  useEffect(() => {
    if (!ladderRival || isLoading || hasRevealedRivalRef.current) return
    const note = ladderRivalNoteRef.current
    if (!note) return
    hasRevealedRivalRef.current = true
    // Never pull focus away from a player who has already started typing or choosing.
    const active = document.activeElement
    if (active && active !== document.body) return
    note.scrollIntoView?.({ block: "center" })
    note.focus({ preventScroll: true })
  }, [ladderRival, isLoading])

  const pendingIncomingCount = useMemo(
    () => challenges.filter(
      (challenge) => challenge.opponentUserId === currentUserId && challenge.status === "pending"
    ).length,
    [challenges, currentUserId]
  )
  const visibleChallenges = useMemo(() => {
    if (filter === "incoming") return challenges.filter((challenge) => challenge.opponentUserId === currentUserId)
    if (filter === "outgoing") return challenges.filter((challenge) => challenge.challengerUserId === currentUserId)
    return challenges
  }, [challenges, currentUserId, filter])

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
      if (searchParams.has("rival")) setSearchParams({}, { replace: true })
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
  const emptyCopy = filter === "incoming"
    ? "No incoming duels. Nobody has challenged you yet."
    : filter === "outgoing"
      ? "No sent duels. Pick a rival below to start one."
      : "No duels yet. Pick a rival below to start one."

  return (
    <div className="duelPage pageCenter">
      <CommandHeader
        routeId="duels"
        eyebrow="Ghost network"
        title="Duel command"
        subtitle="Lock a rival. Choose your run. Put a score on the line."
      />

      <section className="duelInbox" aria-labelledby="duel-inbox-title">
        <h2 className="uiVisuallyHidden" id="duel-inbox-title">Duel signals</h2>
        <div className="leaderboardBoardTabs" role="tablist" aria-label="Challenge filters">
          {FILTERS.map((option) => (
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
              {option.id === "incoming" && pendingIncomingCount > 0 ? `Incoming · ${pendingIncomingCount}` : option.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="duelRow duelNotice" role="status" aria-live="polite">
            <strong>Scanning rival channels</strong>
          </div>
        ) : null}

        {!isLoading && loadError ? (
          <div className="duelRow duelNotice" role="alert">
            <img src="/art/duels/rival-masked.png" alt="" width="320" height="317" decoding="async" />
            <div>
              <strong>Rival network unavailable</strong>
              <p>{loadError}</p>
            </div>
            <button
              type="button"
              className="secondaryButton"
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

        {!isLoading && !loadError && visibleChallenges.length === 0 ? (
          <div className="duelRow duelNotice" role="status">
            <img src="/art/duels/rival-masked.png" alt="" width="320" height="317" decoding="async" />
            <div>
              <strong>{emptyCopy.split(". ")[0]}.</strong>
              <p>{emptyCopy.split(". ")[1]}</p>
            </div>
          </div>
        ) : null}

        <div className="duelRows">
          {visibleChallenges.map((challenge) => (
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

      <section className="duelComposer" aria-labelledby="duel-composer-title">
        <form className="duelForm" onSubmit={handleSendChallenge}>
          <h2 className="uiVisuallyHidden" id="duel-composer-title">Create a ghost duel</h2>

          <div className="duelFaceoff">
            <PlayerPortrait className="duelYouArt" name={currentUsername} size={124} />
            <strong className="duelYouName">{currentUsername || "You"}</strong>
            <b className="duelVs" aria-hidden="true">VS</b>
            <p className={`duelStake${selectedReplay ? " isLocked" : ""}`}>
              <small>{selectedReplay ? getModeLabel({ modeId: selectedReplay.modeId, fallback: selectedReplay.modeId }) : "Score to beat"}</small>
              <strong>{selectedReplay ? Number(selectedReplay.score || 0).toLocaleString() : "?"}</strong>
            </p>
            {rivalName
              ? <PlayerPortrait className="duelRivalArt" name={rivalName} size={124} />
              : <img className="duelRivalArt" src="/art/duels/rival-masked.png" alt="" width="320" height="317" decoding="async" />}
            <input
              className="duelField duelRivalInput"
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
          </div>
          {ladderRival && rivalName === ladderRival ? (
            <p className="duelLadderRivalNote" ref={ladderRivalNoteRef} tabIndex={-1}>
              Rival set to {ladderRival}. Pick a run to stake, or type another name.
            </p>
          ) : null}

          <fieldset className="duelStakes">
            <legend>Stake a run</legend>
            {replayLoadError ? (
              <div role="alert" className="duelStakeNote">
                <p>{replayLoadError}</p>
                <button type="button" className="secondaryButton" onClick={loadChallenges}>Retry runs</button>
              </div>
            ) : isLoading ? (
              <p role="status" className="duelStakeNote">Loading your runs…</p>
            ) : replays.length > 0 ? (
              <div className="duelTokens" role="radiogroup" aria-label="Choose a replay">
                {replays.map((replay) => {
                  const isSelected = String(replay.id) === String(sendForm.replayId)
                  return (
                    <button
                      key={replay.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`duelToken ${isSelected ? "isSelected" : ""}`}
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
                      <span>{getModeLabel({ modeId: replay.modeId, fallback: replay.modeId })}</span>
                      <strong>{Number(replay.score || 0).toLocaleString()}</strong>
                      <span className="uiVisuallyHidden"> Score</span>
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

          <div className="duelSend">
            <label>
              <span className="uiVisuallyHidden">Message (optional)</span>
              <input
                className="duelField"
                type="text"
                maxLength={280}
                value={sendForm.message}
                onChange={(event) => setSendForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Add a taunt (optional)"
              />
            </label>
            <button type="submit" className="primaryButton" disabled={isSending || !launchReady}>
              <PaperPlaneTilt weight="fill" aria-hidden="true" />
              {isSending ? "Transmitting" : "Send duel"}
            </button>
          </div>

          {!launchReady && !sendSuccess ? (
            <p className="duelHint">
              {rivalName ? "Choose a run to send the duel." : "Pick a rival and a run to send the duel."}
            </p>
          ) : null}
          {sendError ? <p className="formError duelHint is-error" role="alert">{sendError}</p> : null}
          {sendSuccess ? (
            <p className="duelHint is-success" role="status">
              <Check weight="bold" aria-hidden="true" /> Duel transmitted to {sendSuccess}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  )
}
