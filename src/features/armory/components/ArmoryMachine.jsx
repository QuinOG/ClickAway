import { MODULE_SLOTS } from "../../../constants/buildcraft.js"
import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

// The bench renders the target larger than in-round so it reads as the hero
// object, while size differences between builds stay proportional and visible.
export const MACHINE_TARGET_SCALE = 1.6

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

function MachineHousing({ module }) {
  const isNeutral = module.moduleId === DEFAULT_MODULE_ID_BY_SLOT_ID[module.slotId]

  return (
    <div
      className={`armoryMachineHousing housing-${module.slotId} tone-${module.slotId} ${isNeutral ? "isNeutral" : ""}`}
    >
      <span className={`armoryMachineHousingGlyph tone-${module.slotId}`} aria-hidden="true">
        <ModuleSlotGlyph slotId={module.slotId} />
      </span>
      <span className="armoryMachineHousingBody">
        <span className="armoryMachineHousingSlot">{module.slotLabel}</span>
        <strong className="armoryMachineHousingLabel">{module.label}</strong>
      </span>
    </div>
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
    <div className="armoryMachineActions">
      <button type="button" className="secondaryButton" onClick={machineApi.requestReset}>
        Strip to Factory Spec
      </button>
    </div>
  )
}

export default function ArmoryMachine({
  loadout,
  presentation,
  nameplateRef,
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
      <div className="armoryMachine" key={loadout.id}>
        <div className="armoryMachineCore">
          {presentation.moduleStack.map((module) => (
            <MachineHousing key={module.slotId} module={module} />
          ))}

          <span
            className={`armoryMachineTarget ${hasSkinImage ? "hasImage" : buttonSkinClass}`}
            style={getTargetSkinStyle({
              targetSize,
              imageSrc: buttonSkinImageSrc,
              imageScale: buttonSkinImageScale,
            })}
            aria-hidden="true"
          />
        </div>

        <div className="armoryMachineRack" aria-label="Racked hotbar">
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
