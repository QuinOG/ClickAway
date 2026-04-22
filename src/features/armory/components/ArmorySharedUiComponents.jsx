import {
  getPowerupById,
} from "../../../constants/buildcraft.js"
import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

export function ArmoryStepGlyph({ stepId = "", className = "" }) {
  if (stepId === "passives") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6.5h12" />
        <path d="M6 12h12" />
        <path d="M6 17.5h12" />
        <circle cx="9" cy="6.5" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="11" cy="17.5" r="1.5" />
      </svg>
    )
  }

  if (stepId === "hotbar") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="3" />
        <path d="M9 10.5h0" />
        <path d="M12 10.5h0" />
        <path d="M15 10.5h0" />
      </svg>
    )
  }

  if (stepId === "review") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 3v2.5" />
        <path d="M12 18.5V21" />
        <path d="M3 12h2.5" />
        <path d="M18.5 12H21" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7.5h12" />
      <path d="M6 12h12" />
      <path d="M6 16.5h8" />
      <path d="M16.5 16.5h1" />
    </svg>
  )
}

export function ArmoryRailStepButton({ step, index, isActive = false, onClick }) {
  return (
    <button
      type="button"
      className={`armoryRailStepButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armoryRailStepIndex">{index + 1}</span>
      <span className="armoryRailStepGlyph" aria-hidden="true">
        <ArmoryStepGlyph stepId={step.id} className="armoryRailStepGlyphIcon" />
      </span>
      <span className="armoryRailStepBody">
        <strong className="armoryRailStepTitle">{step.label}</strong>
        <span className="armoryRailStepLead">{step.lead}</span>
      </span>
    </button>
  )
}

export function ArmorySlotRailButton({ loadout, index, presentation, isActive = false, onClick }) {
  return (
    <button
      type="button"
      className={`armorySlotRailButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armorySlotRailIndex">{index + 1}</span>
      <span className="armorySlotRailBody">
        <span className="armorySlotRailLabel">Build {index + 1}</span>
        <strong className="armorySlotRailName">{loadout.name}</strong>
      </span>
      <span className="armorySlotRailGlyph" aria-hidden="true">
        <BuildIdentityGlyph
          identity={presentation?.identity.label}
          className="armorySlotRailGlyphIcon"
        />
      </span>
    </button>
  )
}

export function ArmoryStepCard({ step, index, summary, isActive = false, onActivate, children }) {
  return (
    <section className={`armoryStepCard armoryStepCard-${step.id} ${isActive ? "isActive" : ""}`}>
      <button
        type="button"
        className="armoryStepToggle"
        onClick={onActivate}
        aria-expanded={isActive}
      >
        <span className="armoryStepIndex">{index + 1}</span>
        <span className="armoryStepGlyph" aria-hidden="true">
          <ArmoryStepGlyph stepId={step.id} className="armoryStepGlyphIcon" />
        </span>
        <span className="armoryStepHeading">
          <strong className="armoryStepTitle">{step.label}</strong>
          <span className="armoryStepLead">{step.lead}</span>
        </span>
        <span className="armoryStepSummary">{summary}</span>
      </button>
      {isActive ? <div className="armoryStepContent">{children}</div> : null}
    </section>
  )
}

export function ArmoryChoiceCard({
  tone = "",
  icon = null,
  label,
  impact = "",
  hint = "",
  isSelected = false,
  isDisabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`armoryChoiceCard ${tone} ${isSelected ? "isSelected" : ""}`}
      disabled={isDisabled}
      onClick={onClick}
    >
      <span className="armoryChoiceIcon" aria-hidden="true">{icon}</span>
      <span className="armoryChoiceBody">
        <strong className="armoryChoiceLabel">{label}</strong>
        <span className="armoryChoiceImpact">{impact}</span>
      </span>
      {hint ? <span className="armoryChoiceHint">{hint}</span> : null}
    </button>
  )
}

export function ArmoryDetailPanel({ eyebrow = "", title = "", lead = "", rows = [], exactChips = [] }) {
  return (
    <section className="armoryDetailPanel" aria-label={title}>
      <div className="armoryDetailHeader">
        <p className="armoryDetailEyebrow">{eyebrow}</p>
        <h3 className="armoryDetailTitle">{title}</h3>
        <p className="armoryDetailLead">{lead}</p>
      </div>

      <div className="armoryDetailRows">
        {rows.map((row) => (
          <div key={row.label} className="armoryDetailRow">
            <span className="armoryDetailLabel">{row.label}</span>
            <span className="armoryDetailValue">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="armoryExactList" aria-label="Exact values">
        {exactChips.map((chip) => (
          <span key={chip} className="armoryExactChip">{chip}</span>
        ))}
      </div>
    </section>
  )
}

export function ArmoryHotbarButton({ powerupId, index, cadenceLabel = "", isActive = false, onClick }) {
  const powerup = getPowerupById(powerupId)

  return (
    <button
      type="button"
      className={`armoryHotbarButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armoryHotbarKey">{index + 1}</span>
      <span className="armoryHotbarGlyph" aria-hidden="true">
        <PowerupGlyph powerupId={powerupId} />
      </span>
      <span className="armoryHotbarBody">
        <strong className="armoryHotbarLabel">{powerup?.label ?? "Choose Power"}</strong>
        <span className="armoryHotbarMeta">{cadenceLabel || "No cadence"}</span>
      </span>
    </button>
  )
}

export function ReviewModeButton({ mode, isActive = false, onClick }) {
  return (
    <button
      type="button"
      className={`armoryModeButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armoryModeButtonLabel">{mode.label}</span>
      <span className="armoryModeButtonMeta">
        {mode.isTimedRound === false ? "No timer" : `${mode.durationSeconds}s`}
      </span>
    </button>
  )
}
