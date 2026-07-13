import {
  MODULE_SLOTS,
  getPassiveModuleById,
  normalizeLoadoutState,
} from "../constants/buildcraft.js"
import { normalizeDraftName } from "../features/armory/armoryUtils.js"

// Blueprint codes (Phase 11): a compact, client-only export/import of a build.
// Codes carry no server identity — importing one is just a request, so the
// existing level-clamped normalizer still rules on what actually lands.
const BLUEPRINT_PREFIX = "CAB1-"
const BLUEPRINT_STUB_LOADOUT_ID = "loadout_1"

function toBase64Url(json) {
  const base64 = btoa(unescape(encodeURIComponent(json)))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const remainder = padded.length % 4
  const withPadding = remainder ? padded + "=".repeat(4 - remainder) : padded
  return decodeURIComponent(escape(atob(withPadding)))
}

export function encodeBlueprint(loadout = {}) {
  const payload = {
    v: 1,
    n: normalizeDraftName(loadout.name, "Loadout"),
    t: String(loadout.moduleIds?.tempoCoreId || ""),
    s: String(loadout.moduleIds?.streakLensId || ""),
    p: String(loadout.moduleIds?.powerRigId || ""),
    h: Array.isArray(loadout.powerupIds) ? loadout.powerupIds.map(String) : [],
  }

  return `${BLUEPRINT_PREFIX}${toBase64Url(JSON.stringify(payload))}`
}

function decodeBlueprint(code = "") {
  const trimmedCode = String(code || "").trim()
  if (!trimmedCode.startsWith(BLUEPRINT_PREFIX)) {
    return { ok: false, error: "Not a recognized blueprint code." }
  }

  let payload
  try {
    payload = JSON.parse(fromBase64Url(trimmedCode.slice(BLUEPRINT_PREFIX.length)))
  } catch {
    return { ok: false, error: "This blueprint code is corrupted." }
  }

  if (!payload || typeof payload !== "object" || payload.v !== 1) {
    return { ok: false, error: "This blueprint code is corrupted." }
  }

  return {
    ok: true,
    loadout: {
      id: BLUEPRINT_STUB_LOADOUT_ID,
      name: normalizeDraftName(payload.n, "Imported Build"),
      moduleIds: {
        tempoCoreId: String(payload.t || ""),
        streakLensId: String(payload.s || ""),
        powerRigId: String(payload.p || ""),
      },
      powerupIds: Array.isArray(payload.h) ? payload.h.map(String) : [],
    },
  }
}

// Decodes, then runs the requested build back through the same level-clamped
// normalizer the server trusts (`normalizeLoadoutState`) — a locked part in
// the code falls back exactly the way a forged snapshot would, and the caller
// gets a plain-language note about what changed.
export function importBlueprint(code, playerLevel = 1) {
  const decoded = decodeBlueprint(code)
  if (!decoded.ok) return decoded

  const { activeLoadout } = normalizeLoadoutState(
    playerLevel,
    [decoded.loadout],
    BLUEPRINT_STUB_LOADOUT_ID
  )

  const notes = []

  MODULE_SLOTS.forEach((slot) => {
    const requestedId = decoded.loadout.moduleIds[slot.key]
    const resolvedId = activeLoadout.moduleIds[slot.key]
    if (requestedId && requestedId !== resolvedId) {
      const requestedModule = getPassiveModuleById(requestedId)
      notes.push(
        requestedModule
          ? `${slot.label}: "${requestedModule.label}" requires Level ${requestedModule.unlockLevel} — used your closest legal option instead.`
          : `${slot.label}: unrecognized part — used your closest legal option instead.`
      )
    }
  })

  if (decoded.loadout.powerupIds.some((id) => !activeLoadout.powerupIds.includes(id))) {
    notes.push("One or more tools in the code aren't unlocked yet — the closest legal hotbar was used instead.")
  }

  return {
    ok: true,
    name: activeLoadout.name,
    moduleIds: activeLoadout.moduleIds,
    powerupIds: activeLoadout.powerupIds,
    notes,
  }
}
