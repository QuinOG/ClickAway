import { fetchCurrentUser } from "../services/clickAwayHttpApiClient.js"

// Rounds, purchases, equips and preference saves each answer with a full
// progress snapshot. A snapshot may only be applied when:
// 1. it belongs to the current login session (a slow response from an account
//    that has since logged out must not fill in the next player's state), and
// 2. no response from a request started later has already been applied
//    (an older snapshot would roll back, say, a purchase made after the round).
let sessionGeneration = 0
let requestCounter = 0
let lastAppliedRequest = 0

export function startNewProgressSession() {
  sessionGeneration += 1
  lastAppliedRequest = requestCounter
}

export function beginProgressRequest() {
  requestCounter += 1
  return { session: sessionGeneration, request: requestCounter }
}

export function isCurrentSession(ticket) {
  return Boolean(ticket) && ticket.session === sessionGeneration
}

// Returns "apply", "superseded" (a newer response already landed) or "other-session".
export function claimProgressResponse(ticket) {
  if (!isCurrentSession(ticket)) return "other-session"
  if (ticket.request < lastAppliedRequest) return "superseded"
  lastAppliedRequest = ticket.request
  return "apply"
}

// Applies a response's progress if it is still the newest for this session. If
// a newer response already landed, this one's snapshot may be missing changes,
// so the current state is fetched again instead of applying the old snapshot.
export async function applyProgressResponse(ticket, progress, applyProgress) {
  const claim = claimProgressResponse(ticket)
  if (claim === "apply") {
    if (progress) applyProgress(progress)
    return
  }
  if (claim !== "superseded") return

  const refreshTicket = beginProgressRequest()
  try {
    const session = await fetchCurrentUser()
    if (claimProgressResponse(refreshTicket) === "apply" && session?.progress) {
      applyProgress(session.progress)
    }
  } catch {
    // The next save or reload brings the state back in line.
  }
}
