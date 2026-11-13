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
// field -> { value, sequence }: the newest unsaved value of each preference.
let pendingPreferenceFields = new Map()
let pendingPreferenceSequence = 0
let lastAppliedSnapshotAt = 0

export function startNewProgressSession() {
  sessionGeneration += 1
  lastAppliedRequest = requestCounter
  pendingPreferenceFields = new Map()
  lastAppliedSnapshotAt = 0
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
  Object.entries(fields).forEach(([field, value]) => {
    pendingPreferenceFields.set(field, { value, sequence: pendingPreferenceSequence })
  })
  return pendingPreferenceSequence
}

// Drops the fields this save still owns (a newer edit of the same field keeps
// its own). Each save clears only what it wrote, so a failed save's fields stop
// being laid over later responses.
export function settlePendingPreferences(sequence) {
  pendingPreferenceFields.forEach((entry, field) => {
    if (entry.sequence === sequence) pendingPreferenceFields.delete(field)
  })
}

function withPendingPreferences(progress) {
  if (!progress || pendingPreferenceFields.size === 0) return progress
  const overlay = {}
  pendingPreferenceFields.forEach((entry, field) => {
    overlay[field] = entry.value
  })
  return { ...progress, ...overlay }
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
function isOlderSnapshot(progress) {
  const snapshotAt = Number(progress?.snapshotAtMs) || 0
  return snapshotAt > 0 && snapshotAt < lastAppliedSnapshotAt
}

function applySnapshot(progress, applyProgress) {
  lastAppliedSnapshotAt = Math.max(lastAppliedSnapshotAt, Number(progress?.snapshotAtMs) || 0)
  applyProgress(withPendingPreferences(progress))
}

export async function applyProgressResponse(ticket, progress, applyProgress) {
  const claim = claimProgressResponse(ticket)
  if (claim === "other-session") return "other-session"
  // Applied directly only when it is the newest for this session and the server
  // read it no earlier than what is on screen. A missing snapshot (the server
  // saved but couldn't read progress back) or an older one is fetched fresh.
  if (claim === "apply" && progress && !isOlderSnapshot(progress)) {
    applySnapshot(progress, applyProgress)
    return "applied"
  }

  const refreshTicket = beginProgressRequest()
  try {
    const session = await fetchCurrentUser()
    if (claimProgressResponse(refreshTicket) === "apply" && session?.progress && !isOlderSnapshot(session.progress)) {
      applySnapshot(session.progress, applyProgress)
    }
    return "refreshed"
  } catch {
    return "refresh-failed"
  }
}
