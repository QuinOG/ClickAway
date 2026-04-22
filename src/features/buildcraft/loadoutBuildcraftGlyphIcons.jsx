export function BuildIdentityGlyph({ identity = "Balanced", className = "" }) {
  const glyphTone = String(identity || "Balanced").toLowerCase()

  if (glyphTone === "control") {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="42" />
        <circle cx="60" cy="60" r="24" />
        <circle cx="60" cy="60" r="7" />
        <path d="M60 10v18" />
        <path d="M60 92v18" />
        <path d="M10 60h18" />
        <path d="M92 60h18" />
      </svg>
    )
  }

  if (glyphTone === "pressure") {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <path d="M60 10 86 40 72 40 96 74 66 74 74 110 28 58 50 58 34 10Z" />
      </svg>
    )
  }

  if (glyphTone === "utility") {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="16" />
        <ellipse cx="60" cy="60" rx="42" ry="16" />
        <ellipse cx="60" cy="60" rx="16" ry="42" />
        <path d="M26 32 94 88" />
        <path d="M94 32 26 88" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="38" />
      <path d="M60 18 72 48h30L78 66l10 30-28-18-28 18 10-30-24-18h30Z" />
    </svg>
  )
}

export function ModuleSlotGlyph({ slotId = "tempoCore", className = "" }) {
  if (slotId === "streakLens") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 16.5 9.5 12l3 3 6.5-7" />
        <path d="M15.5 8H19v3.5" />
      </svg>
    )
  }

  if (slotId === "powerRig") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="8" width="12" height="8" rx="2" />
        <path d="M17 10.5h2a1.5 1.5 0 0 1 0 3h-2" />
        <path d="m11.5 9.5-2.5 3h2l-1 2h.5l3-3h-2l1-2Z" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v5" />
      <path d="M12 15v5" />
      <path d="M4 12h5" />
      <path d="M15 12h5" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  )
}

export function PowerupGlyph({ powerupId = "", className = "" }) {
  if (powerupId === "time_boost") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="7" />
        <path d="M12 9.5V13l2.5 1.8" />
        <path d="M9 4.5h6" />
      </svg>
    )
  }

  if (powerupId === "size_boost") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5H3.5V7" />
        <path d="M17 3.5h3.5V7" />
        <path d="M7 20.5H3.5V17" />
        <path d="M17 20.5h3.5V17" />
        <path d="M3.5 7 8 2.5" />
        <path d="M20.5 7 16 2.5" />
        <path d="M3.5 17 8 21.5" />
        <path d="M20.5 17 16 21.5" />
      </svg>
    )
  }

  if (powerupId === "freeze_movement") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4h8" />
        <path d="M8 20h8" />
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h10" />
      </svg>
    )
  }

  if (powerupId === "magnet_center") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5v6a5 5 0 0 0 10 0V5" />
        <path d="M7 5H4.5" />
        <path d="M19.5 5H17" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    )
  }

  if (powerupId === "combo_surge") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4.5 14.5 4-4 3 3 8-8" />
        <path d="M16.5 5.5H20v3.5" />
      </svg>
    )
  }

  if (powerupId === "guard_charge") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.5 6.5 7v4.7c0 3.1 2.2 5.9 5.5 7.8 3.3-1.9 5.5-4.7 5.5-7.8V7Z" />
        <path d="m9.5 12.5 1.8 1.8 3.2-3.2" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3.5 2.1 5.4 5.4 2.1-5.4 2.1-2.1 5.4-2.1-5.4-5.4-2.1 5.4-2.1Z" />
    </svg>
  )
}
