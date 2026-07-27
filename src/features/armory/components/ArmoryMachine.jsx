import { MODULE_SLOTS } from "../../../constants/buildcraft.js"
import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

// The bench renders the target larger than in-round so it reads as the hero
// object, while size differences between builds stay proportional and visible.
export const MACHINE_TARGET_SCALE = 1.85

const DEFAULT_MODULE_ID_BY_SLOT_ID = Object.fromEntries(
  MODULE_SLOTS.map((slot) => [slot.id, slot.defaultModuleId])
)

function getTargetSkinStyle({ targetSize, imageSrc, imageScale }) {
  return {
    width: `${targetSize}px`,
    height: `${targetSize}px`,
    backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
    backgroundSize: imageSrc ? `${imageScale ?? 100}%` : undefined,
  }
}

function MachineHousing({ module, isSelected = false, onOpenLane }) {
  const isNeutral = module.moduleId === DEFAULT_MODULE_ID_BY_SLOT_ID[module.slotId]

  return (
    <button
      type="button"
      className={`armoryMachineHousing housing-${module.slotId} tone-${module.slotId} ${isNeutral ? "isNeutral" : ""} ${isSelected ? "isSelected" : ""}`}
      data-module-state="installed"
      onClick={() => onOpenLane?.(module.slotId)}
      title={`Open ${module.slotLabel} parts`}
    >
      <span className={`armoryMachineHousingGlyph tone-${module.slotId}`} aria-hidden="true">
        <ModuleSlotGlyph slotId={module.slotId} />
      </span>
      {/* Keyed by installed module so a fresh part visibly seats into place. */}
      <span
        key={module.moduleId || module.slotId}
        className="armoryMachineHousingBody armoryPartSeat"
      >
        <span className="armoryMachineHousingSlot">{module.slotLabel}</span>
        <strong className="armoryMachineHousingLabel">{module.label}</strong>
      </span>
    </button>
  )
}

function MachineNameplate({ loadout, presentation, nameplateRef, machineApi }) {
  return (
    <div className="armoryMachineNameplate" ref={nameplateRef}>
      {machineApi.isEditingName ? (
        <input
          className="armoryNameplateInput"
          aria-label="Build name"
          autoFocus
          value={machineApi.nameDraft}
          maxLength={24}
          onChange={(event) => machineApi.setNameDraft(event.target.value)}
          onBlur={machineApi.commitNameEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              machineApi.commitNameEdit()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              machineApi.cancelNameEdit()
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="armoryMachineNameButton"
          onClick={machineApi.startNameEdit}
          title="Rename this build"
        >
          <strong className="armoryMachineName">{loadout.name}</strong>
          <span className="armoryMachineNameHint" aria-hidden="true">Rename</span>
        </button>
      )}
      <span className="armoryMachineIdentity">
        <span className="armoryMachineIdentityGlyph" aria-hidden="true">
          <BuildIdentityGlyph identity={presentation.identity.label} />
        </span>
        {presentation.titleLine}
      </span>
    </div>
  )
}

function MachineWorkshopActions({ machineApi }) {
  if (machineApi.isResetPending) {
    return (
      <div className="armoryMachineActions isConfirming">
        <span className="armoryMachineConfirmText">Strip this build to factory spec?</span>
        <button type="button" className="secondaryButton" onClick={machineApi.cancelBayAction}>
          Keep Build
        </button>
        <button type="button" className="secondaryButton armoryDangerButton" onClick={machineApi.confirmBayAction}>
          Confirm Strip
        </button>
      </div>
    )
  }

  return (
    <div className="armoryMachineActionStack">
      <div className="armoryMachineActions" aria-label="Build analysis">
        <button type="button" className="secondaryButton" onClick={machineApi.openSpecSheet}>
          Spec Sheet
        </button>
        <button type="button" className="secondaryButton" onClick={machineApi.openModeMatrix}>
          Compare Modes
        </button>
      </div>
      <details className="armoryMachineOptions">
        <summary>Build options</summary>
        <div className="armoryMachineOptionsPanel">
          <p>Restore this bay to its original parts and name.</p>
          <button type="button" className="secondaryButton armoryDangerButton" onClick={machineApi.requestReset}>
            Strip to Factory Spec
          </button>
        </div>
      </details>
    </div>
  )
}

export default function ArmoryMachine({
  loadout,
  presentation,
  nameplateRef,
  machineRef,
  machineApi,
}) {
  const { buttonSkinClass = "", buttonSkinImageSrc = "", buttonSkinImageScale = 100 } = machineApi
  const hasSkinImage = Boolean(buttonSkinImageSrc)
  const targetSize = Math.round(
    presentation.roundRules.initialButtonSize * MACHINE_TARGET_SCALE
  )
  return (
    <section className="armoryStage" aria-label="Active build machine">
      {/* Keyed by bay so switching bays rolls a fresh machine onto the stage
          (reduced motion crossfades instead — see armory.css). */}
      <div className="armoryMachine" key={loadout.id} ref={machineRef}>
        <div className="armoryMachineCore">
          <div className="armoryMachineAssembly">
            <svg className="armoryMachineConduits" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true">
              <path className="conduit-tempoCore" d="M300 205 L92 205" />
              <path className="conduit-streakLens" d="M300 205 L300 62" />
              <path className="conduit-powerRig" d="M300 205 L508 205" />
              <circle cx="300" cy="205" r="116" />
            </svg>

            <div className="armoryMachineHousingRow" aria-label="Passive stack">
              {presentation.moduleStack.map((module) => (
                <MachineHousing
                  key={module.slotId}
                  module={module}
                  isSelected={machineApi.selectedModuleSlotId === module.slotId}
                  onOpenLane={machineApi.openModuleLane}
                />
              ))}
            </div>

            <span
              className={`armoryMachineTarget ${hasSkinImage ? "hasImage" : buttonSkinClass}`}
              style={getTargetSkinStyle({
                targetSize,
                imageSrc: buttonSkinImageSrc,
                imageScale: buttonSkinImageScale,
              })}
              aria-hidden="true"
            >
            </span>
          </div>
        </div>

        <div className="armoryMachineRack" aria-label="Equipped powerups">
          {presentation.powerSlots.map((powerSlot, index) => (
            <div key={`${powerSlot.id}-${index + 1}`} className="armoryMachineRackSlot">
              <span className="armoryMachineRackKey" aria-hidden="true">{index + 1}</span>
              <span className="armoryMachineRackGlyph" aria-hidden="true">
                <PowerupGlyph powerupId={powerSlot.id} />
              </span>
              <span className="armoryMachineRackBody">
                <strong className="armoryMachineRackLabel">{powerSlot.label}</strong>
                <span className="armoryMachineRackMeta">{powerSlot.cadenceLabel}</span>
              </span>
            </div>
          ))}
        </div>

        <MachineNameplate
          loadout={loadout}
          presentation={presentation}
          nameplateRef={nameplateRef}
          machineApi={machineApi}
        />

        <MachineWorkshopActions machineApi={machineApi} />
      </div>
    </section>
  )
}
