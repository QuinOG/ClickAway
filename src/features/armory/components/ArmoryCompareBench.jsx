import {
  BuildIdentityGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { PartEmblem } from "../../../components/art/GameIcons.jsx"
import { getExactMetric } from "../armoryExactMetrics.js"
import ArmoryModeManifest from "./ArmoryModeManifest.jsx"
import { useOverlayDismiss } from "../useOverlayDismiss.js"

function GhostMachine({ label, loadout, presentation, isGhost = false }) {
  const targetSize = Math.max(56, Math.min(80, Math.round(presentation.roundRules.initialButtonSize * 0.66)))
  return (
    <div className={`armoryCompareMachine ${isGhost ? "isGhost" : ""}`} data-lead={label}>
      <span className="armoryCompareMachineLabel">{label}</span>
      <div className="armoryCompareRig">
        <div className="armoryCompareRigMechanics" aria-hidden="true">
          <span className="armoryCompareRigConnector left" /><span className="armoryCompareRigConnector right" /><span className="armoryCompareRigConnector top" />
          <span className="armoryCompareRigBase" />
          <span className="armoryCompareRigHub"><span className="armoryCompareRigCore" style={{ width: targetSize, height: targetSize }}>
            <img className="armoryCompareRigTarget" src="/art/compare/hub-target.png" alt="" width="320" height="320" decoding="async" />
          </span></span>
          {presentation.moduleStack.map((module) => <span key={module.slotId} className={`armoryCompareRigModule slot-${module.slotId}`}><PartEmblem partId={module.moduleId} slotId={module.slotId} size={32} /></span>)}
        </div>
        <div className="armoryCompareRigLabels">{presentation.moduleStack.map((module) => <span key={module.slotId} className={`armoryCompareRigModuleLabel slot-${module.slotId}`}><b>{module.slotLabel}</b><br />{module.label}</span>)}</div>
      </div>
      <strong className="armoryCompareMachineName">{loadout.name}</strong>
      <span className="armoryCompareMachineIdentity"><span className="armoryCompareMachineIdentityGlyph" aria-hidden="true"><BuildIdentityGlyph identity={presentation.identity.label} /></span>{presentation.titleLine}</span>
    </div>
  )
}

// Exact rule rows for the bench; `better` says which direction wins.
const COMPARE_ROWS = [
  { label: "Aim Window", better: "higher" },
  { label: "Shrink Pace", better: "lower" },
  { label: "Combo Ramp", better: "lower" },
  { label: "Miss Cost", better: "lower" },
  { label: "Power Tempo", better: "lower" },
  {
    label: "Starting Charges",
    better: "higher",
    metric: (rules) => {
      const value = Number(rules.startingPowerupCharges) || 0
      return { value, text: `${value} per power`, digits: 0, suffix: " per power" }
    },
  },
  {
    label: "Min Target",
    better: "higher",
    metric: (rules) => ({ value: Number(rules.minButtonSize) || 0, text: `${Number(rules.minButtonSize) || 0}px`, digits: 0, suffix: "px" }),
  },
  {
    label: "Score Mult",
    better: "higher",
    metric: (rules) => {
      const value = Number(rules.scoreMultiplier) || 1
      return { value, text: `x${value.toFixed(2)}`, digits: 2, suffix: "x" }
    },
  },
]

function CompareNumbers({ activeRules, ghostRules }) {
  return <div className="armoryCompareInstrumentGrid" aria-label="Exact rules, active versus ghost">
    {COMPARE_ROWS.map((row) => {
      const read = row.metric ?? ((rules) => getExactMetric(row.label, rules))
      const active = read(activeRules ?? {})
      const ghost = read(ghostRules ?? {})
      const diff = Number((ghost.value - active.value).toFixed(active.digits))
      const tone = diff === 0 ? "is-same" : (row.better === "higher" ? diff > 0 : diff < 0) ? "is-gain" : "is-cost"
      const sign = diff > 0 ? "+" : "−"
      const max = Math.max(Math.abs(active.value), Math.abs(ghost.value))
      const counts = [active, ghost].map((item) => max ? Math.round(10 * Math.abs(item.value) / max) : 0)
      return <section key={row.label} className="armoryCompareInstrument">
        <div className="armoryCompareInstrumentLead" aria-hidden="true" />
        <div className="armoryCompareInstrumentLabel">{row.label}</div>
        <span className={`armoryCompareInstrumentDelta ${tone}`}>{diff === 0 ? "Same" : `${sign}${Math.abs(diff).toFixed(active.digits)}${active.suffix}`}</span>
        <dl className="armoryCompareInstrumentValues">{[active, ghost].map((item, index) => <div key={index}>
          <dt>{index ? "Ghost" : "Active"}</dt><dd>{item.text}</dd>
          <span className="armoryCompareInstrumentGauge" aria-label="Bars relative to this pair">{Array.from({ length: 10 }, (_, i) => <i key={i} aria-hidden="true" className={`${i < counts[index] ? "filled" : ""} ${i >= counts[1-index] ? tone : ""}`} />)}</span>
        </div>)}</dl>
      </section>
    })}
  </div>
}

function BayCompareView({ activeLoadout, activePresentation, ghostLoadout, ghostPresentation }) {
  if (!ghostLoadout || !ghostPresentation) {
    return (
      <p className="armoryCompareEmpty">
        Choose "Compare with active" on a bay to summon it here.
      </p>
    )
  }

  return (
    <>
      <div className="armoryCompareMachines">
        <GhostMachine label="Active" loadout={activeLoadout} presentation={activePresentation} />
        <GhostMachine label="Ghost" loadout={ghostLoadout} presentation={ghostPresentation} isGhost />
      </div>

      <CompareNumbers
        activeName={activeLoadout.name}
        ghostName={ghostLoadout.name}
        activeRules={activePresentation.roundRules}
        ghostRules={ghostPresentation.roundRules}
      />

      <div className="armoryCompareSpecColumns">
        {[
          { label: activeLoadout.name, presentation: activePresentation },
          { label: ghostLoadout.name, presentation: ghostPresentation },
        ].map(({ label, presentation }) => (
          <div key={label} className="armoryCompareSpecColumn">
            <span className="armoryCompareSpecColumnTitle">{label}</span>
            <div className="armoryCompareSpecColumnBody">
              <div>
                <span className="armorySpecSheetPanelTitle">Strengths</span>
                <div className="armoryChipRow">
                  {presentation.strengths.map((item) => (
                    <span key={item} className="armorySnapshotChip tone-good">{item}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="armorySpecSheetPanelTitle">Tradeoffs</span>
                <div className="armoryChipRow">
                  {presentation.tradeoffs.map((item) => (
                    <span key={item} className="armorySnapshotChip tone-risk">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * The Compare Bench (Phase 8): reads which build wins for which mode without
 * ever rendering a KPI table. Presentation derivation stays pure here â€” the
 * bench holds no state of its own beyond which view/ghost the controller
 * points it at, so nothing about a comparison is ever persisted.
 */
export default function ArmoryCompareBench({
  isOpen,
  onClose,
  view,
  onChangeView,
  modeLabel,
  activeLoadout,
  activePresentation,
  ghostLoadout,
  ghostPresentation,
  modePresentations,
}) {
  useOverlayDismiss(isOpen, onClose)
  if (!isOpen) return null

  return (
    <>
      <div className="armoryCompareScrim" onClick={onClose} aria-hidden="true" />
      <section className="armoryCompareBench armoryCompareWorkshop" role="dialog" aria-label="Compare bench">
        <header className="armoryCompareHeader">
          <div>
            <p className="armoryCompareEyebrow">Compare Bench · {modeLabel}</p>
            <h2 className="armoryCompareTitle">Which build, for which mode?</h2>
          </div>
          <button type="button" className="secondaryButton" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="armoryCompareTabs" role="tablist" aria-label="Compare view">
          <button
            type="button"
            role="tab"
            aria-selected={view === "bay"}
            className={`armoryCompareTab ${view === "bay" ? "isActive" : ""}`}
            onClick={() => onChangeView("bay")}
          >
            Bay vs. Bay
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "matrix"}
            className={`armoryCompareTab ${view === "matrix" ? "isActive" : ""}`}
            onClick={() => onChangeView("matrix")}
          >
            Mode Matrix
          </button>
        </div>

        {view === "matrix" ? (
          <ArmoryModeManifest loadoutName={activeLoadout.name} modePresentations={modePresentations} />
        ) : (
          <BayCompareView
            activeLoadout={activeLoadout}
            activePresentation={activePresentation}
            ghostLoadout={ghostLoadout}
            ghostPresentation={ghostPresentation}
          />
        )}
      </section>
    </>
  )
}

