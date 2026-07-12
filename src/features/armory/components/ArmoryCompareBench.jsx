import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import ArmoryInstruments from "./ArmoryInstruments.jsx"
import ArmoryModeManifest from "./ArmoryModeManifest.jsx"

// Ghost machines read at bay-wall scale so both silhouettes fit side by side
// without the bench dwarfing the actual center-stage hero object.
const GHOST_TARGET_SCALE = 0.42

function GhostMachine({ label, loadout, presentation, isGhost = false }) {
  const identity = (presentation.identity.label || "Balanced").toLowerCase()
  const targetSize = Math.round(presentation.roundRules.initialButtonSize * GHOST_TARGET_SCALE)

  return (
    <div
      className={`armoryCompareMachine ${isGhost ? "isGhost" : ""}`}
      data-identity={identity}
    >
      <span className="armoryCompareMachineLabel">{label}</span>
      <span className="armoryCompareMachineTarget" style={{ width: `${targetSize}px`, height: `${targetSize}px` }} aria-hidden="true" />
      <span className="armoryCompareMachineModules" aria-hidden="true">
        {presentation.moduleStack.map((module) => (
          <span key={module.slotId} className={`armoryCompareMachineModule tone-${module.slotId}`}>
            <ModuleSlotGlyph slotId={module.slotId} />
          </span>
        ))}
      </span>
      <strong className="armoryCompareMachineName">{loadout.name}</strong>
      <span className="armoryCompareMachineIdentity">
        <span className="armoryCompareMachineIdentityGlyph" aria-hidden="true">
          <BuildIdentityGlyph identity={presentation.identity.label} />
        </span>
        {presentation.titleLine}
      </span>
    </div>
  )
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

      <ArmoryInstruments
        presentation={activePresentation}
        comparePresentation={ghostPresentation}
        primaryLabel={activeLoadout.name}
        compareLabel={ghostLoadout.name}
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
 * ever rendering a KPI table. Presentation derivation stays pure here — the
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
  if (!isOpen) return null

  return (
    <>
      <div className="armoryCompareScrim" onClick={onClose} aria-hidden="true" />
      <section className="armoryCompareBench" role="dialog" aria-label="Compare bench">
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
