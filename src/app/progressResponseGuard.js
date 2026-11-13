import { fetchCurrentUser } from "../services/clickAwayHttpApiClient.js"

// Rounds, purchases, equips and preference saves each answer with a full
// progress snapshot. A snapshot may only be applied when:
// 1. it belongs to the current login session (a slow response from an account
//    that has since logged out must not fill in the next player's state), and
// 2. no response from a request started later has already been applied
//    (an older snapshot would roll back, say, a purchase made after the round).
// Preference edits that are still saving (Armory builds) are laid over every
// snapshot, so a late response can't undo an edit the server hasn't stored yet.
let sessionGeneration = 0
let requestCounter = 0
let lastAppliedRequest = 0
let pendingPreferences = null
let pendingPreferenceSequence = 0

export function startNewProgressSession() {
  sessionGeneration += 1
  lastAppliedRequest = requestCounter
  pendingPreferences = null
}

export function beginProgressRequest() {
  requestCounter += 1
  return { session: sessionGeneration, request: requestCounter }
}

export function isCurrentSession(ticket) {
  return Boolean(ticket) && ticket.session === sessionGeneration
}

// Records preference fields that are about to be saved; returns a handle for
// clearing them once that save has settled.
export function markPendingPreferences(fields = {}) {
  pendingPreferenceSequence += 1
  pendingPreferences = { ...(pendingPreferences ?? {}), ...fields }
  return pendingPreferenceSequence
}

// Clears the pending overlay once the newest pending save has settled.
export function settlePendingPreferences(sequence) {
  if (sequence === pendingPreferenceSequence) {
    pendingPreferences = null
  }
}

function withPendingPreferences(progress) {
  return pendingPreferences && progress ? { ...progress, ...pendingPreferences } : progress
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
// Returns "applied", "refreshed", "refresh-failed" or "other-session".
export async function applyProgressResponse(ticket, progress, applyProgress) {
  const claim = claimProgressResponse(ticket)
  if (claim === "apply") {
    if (progress) applyProgress(withPendingPreferences(progress))
    return "applied"
  }
  if (claim !== "superseded") return "other-session"

  const refreshTicket = beginProgressRequest()
  try {
    const session = await fetchCurrentUser()
    if (claimProgressResponse(refreshTicket) === "apply" && session?.progress) {
      applyProgress(withPendingPreferences(session.progress))
    }
    return "refreshed"
  } catch {
    return "refresh-failed"
  }
}
