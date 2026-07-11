import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

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
  return <span className={`challengeStatusBadge is-${status}`}>{status}</span>
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
    <article className="challengeCard">
      <div className="challengeCardHeader">
        <div>
          <p className="leaderboardSectionEyebrow">
            {isIncoming ? "Incoming Challenge" : "Sent Challenge"}
          </p>
          <h2 className="cardH2 challengeCardTitle">
            vs {opponentLabel}
          </h2>
        </div>
        <ChallengeStatusBadge status={challenge.status} />
      </div>

      <p className="muted challengeCardMeta">
        Mode: {challenge.modeId} · Target score: {Number(challenge.replayScore || 0).toLocaleString()}
      </p>

      {challenge.message ? (
        <p className="challengeCardMessage">"{challenge.message}"</p>
      ) : null}

      <p className="muted challengeCardTimestamp">
        Sent {formatTimestamp(challenge.createdAt)}
      </p>

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
              onClick={() => onRespond(challenge.id, "accept")}
            >
              Accept
            </button>
            <button
              type="button"
              className="secondaryButton"
              disabled={isResponding}
              onClick={() => onRespond(challenge.id, "decline")}
            >
              Decline
            </button>
          </>
        ) : null}

        {isIncoming && challenge.status === "accepted" ? (
          <button
            type="button"
            className="primaryButton"
            onClick={() => onRaceGhost(challenge)}
          >
            Race Ghost
          </button>
        ) : null}
      </div>
    </article>
  )
}

export default function ChallengesPage({
  currentUserId = "",
}) {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [replays, setReplays] = useState([])
  const [filter, setFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [respondingChallengeId, setRespondingChallengeId] = useState(null)
  const [sendForm, setSendForm] = useState({
    opponentUsername: "",
    replayId: "",
    message: "",
  })
  const [sendError, setSendError] = useState("")
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
    } catch (error) {
      setChallenges([])
      setReplays([])
      setLoadError(error.message || "Unable to load challenges.")
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

  async function handleRespond(challengeId, action) {
    setRespondingChallengeId(challengeId)
    try {
      await respondToChallenge(challengeId, action)
      await loadChallenges()
    } catch (error) {
      setLoadError(error.message || "Unable to update challenge.")
    } finally {
      setRespondingChallengeId(null)
    }
  }

  function handleRaceGhost(challenge) {
    navigate(`/game?challengeId=${challenge.id}&replayId=${challenge.replayId}`)
  }

  async function handleSendChallenge(event) {
    event.preventDefault()
    setSendError("")
    setIsSending(true)

    try {
      await sendChallenge({
        opponentUsername: sendForm.opponentUsername.trim(),
        replayId: Number(sendForm.replayId),
        message: sendForm.message.trim(),
      })
      setSendForm({ opponentUsername: "", replayId: "", message: "" })
      await loadChallenges()
    } catch (error) {
      setSendError(error.message || "Unable to send challenge.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="pageCenter">
      <section className="card">
        <div className="challengePageHeader">
          <div>
            <h1 className="cardTitle">Challenges</h1>
            <p className="muted">
              Send ghost duels from your saved replays and race rival score lines in real time.
            </p>
          </div>
          {pendingIncomingCount > 0 ? (
            <span className="challengePendingBadge">
              {pendingIncomingCount} pending
            </span>
          ) : null}
        </div>

        <div className="challengeFilterRow" role="tablist" aria-label="Challenge filters">
          {[
            { id: "all", label: "All" },
            { id: "incoming", label: "Incoming" },
            { id: "outgoing", label: "Sent" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={filter === option.id}
              className={`leaderboardBoardTab${filter === option.id ? " isActive" : ""}`}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form className="challengeSendForm" onSubmit={handleSendChallenge}>
          <h2 className="cardH2">Send a Challenge</h2>
          <div className="challengeSendGrid">
            <label className="challengeField">
              <span>Opponent username</span>
              <input
                type="text"
                value={sendForm.opponentUsername}
                onChange={(event) => setSendForm((current) => ({
                  ...current,
                  opponentUsername: event.target.value,
                }))}
                placeholder="rival_player"
                required
              />
            </label>

            <label className="challengeField">
              <span>Replay to beat</span>
              <select
                value={sendForm.replayId}
                onChange={(event) => setSendForm((current) => ({
                  ...current,
                  replayId: event.target.value,
                }))}
                required
              >
                <option value="">Select a replay</option>
                {replays.map((replay) => (
                  <option key={replay.id} value={replay.id}>
                    {replay.modeId} · {Number(replay.score || 0).toLocaleString()} pts
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="challengeField">
            <span>Message (optional)</span>
            <input
              type="text"
              maxLength={280}
              value={sendForm.message}
              onChange={(event) => setSendForm((current) => ({
                ...current,
                message: event.target.value,
              }))}
              placeholder="Think you can beat this run?"
            />
          </label>

          {sendError ? <p className="formError" role="alert">{sendError}</p> : null}

          <button type="submit" className="primaryButton" disabled={isSending || replays.length === 0}>
            {replays.length === 0 ? "Play ranked rounds to create replays" : "Send Challenge"}
          </button>
        </form>

        {isLoading ? (
          <p className="muted" aria-live="polite">Loading challenges...</p>
        ) : null}

        {!isLoading && loadError ? (
          <div className="leaderboardStatusCard" role="alert">
            <p className="leaderboardStatusTitle">Challenges unavailable</p>
            <p className="muted">{loadError}</p>
            <button type="button" className="leaderboardRetryButton" onClick={loadChallenges}>
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError && challenges.length === 0 ? (
          <div className="leaderboardStatusCard" role="status">
            <p className="leaderboardStatusTitle">No challenges yet.</p>
            <p className="muted">Send your first ghost duel from a saved replay above.</p>
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
    </div>
  )
}
