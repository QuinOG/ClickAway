import { MODULE_SLOTS } from "../../../constants/buildcraft.js"
import {
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { PartEmblem, PowerEmblem } from "../../../components/art/GameIcons.jsx"
import { getExactMetric } from "../armoryExactMetrics.js"

// The bench renders the target larger than in-round so it reads as the hero
// object, while size differences between builds stay proportional and visible.
export const MACHINE_TARGET_SCALE = 1.65

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
        <PartEmblem partId={module.moduleId} slotId={module.slotId} size={40} />
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
        {/* One build header: the name (click to rename), its identity and the
            build tools sit together above the machine. */}
        <header className="armoryMachineHeader">
          <MachineNameplate
            loadout={loadout}
            presentation={presentation}
            nameplateRef={nameplateRef}
            machineApi={machineApi}
          />
          <MachineWorkshopActions machineApi={machineApi} />
        </header>

        <div className="armoryMachineCore">
          <div className="armoryMachineAssembly">
            {/* The workbench cradle the instrument is bolted to. */}
            <span className="armoryMachineBench" aria-hidden="true">
              <i /><i /><i /><i />
              <em>CA-01</em>
            </span>
            <div className="armoryMachineCoreStage">
              <span className="armoryMachineRig" aria-hidden="true">
                <span className="armoryMachineRigRing">
                  {presentation.moduleStack.map((module) => (
                    <i
                      key={module.slotId}
                      className={`armoryMachineRigArc arc-${module.slotId} ${module.moduleId === DEFAULT_MODULE_ID_BY_SLOT_ID[module.slotId] ? "isStock" : "isFitted"}`}
                    />
                  ))}
                </span>
                <span className="armoryMachineRigTicks" />
                {presentation.moduleStack.map((module) => (
                  <span
                    key={`conduit-${module.slotId}`}
                    className={`armoryMachineRigConduit conduit-${module.slotId} ${machineApi.selectedModuleSlotId === module.slotId ? "isSelected" : ""}`}
                  />
                ))}
                {presentation.moduleStack.map((module) => (
                  <span
                    key={module.slotId}
                    className={`armoryMachineRigMount mount-${module.slotId} tone-${module.slotId} ${module.moduleId === DEFAULT_MODULE_ID_BY_SLOT_ID[module.slotId] ? "isStock" : "isFitted"} ${machineApi.selectedModuleSlotId === module.slotId ? "isSelected" : ""}`}
                  >
                    <PartEmblem partId={module.moduleId} slotId={module.slotId} size={30} />
                  </span>
                ))}
                <span className="armoryMachineRigBed" />
              </span>

              <span
                className={`armoryMachineTarget ${hasSkinImage ? "hasImage" : buttonSkinClass}`}
                style={getTargetSkinStyle({
                  targetSize,
                  imageSrc: buttonSkinImageSrc,
                  imageScale: buttonSkinImageScale,
                })}
                aria-hidden="true"
              >
                {/* Live aim window: the target is drawn at this build's start
                    size, and its centre states that size, the shrink pace
                    and the floor it shrinks to. */}
                <span className="armoryMachineAimReadout">
                  <small>Aim window</small>
                  <b>{presentation.roundRules.initialButtonSize}px</b>
                  <em>{getExactMetric("Shrink Pace", presentation.roundRules).text} · floor {presentation.roundRules.minButtonSize}px</em>
                </span>
              </span>
            </div>

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
          </div>
        </div>

        <div className="armoryMachineRack" aria-label="Equipped powerups">
          {presentation.powerSlots.map((powerSlot, index) => (
            <button
              type="button"
              key={`${powerSlot.id}-${index + 1}`}
              className={`armoryMachineRackSlot ${machineApi.editingPowerSlotIndex === index ? "isEditing" : ""}`}
              aria-pressed={machineApi.editingPowerSlotIndex === index}
              aria-label={`Key ${index + 1}: ${powerSlot.label}, ${powerSlot.cadenceLabel}. Edit this key`}
              onClick={() => machineApi.openPowerKey?.(index)}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-clickaway-power-slot", String(index))
                event.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const sourceSlot = event.dataTransfer.getData("application/x-clickaway-power-slot")
                const fromIndex = /^[0-2]$/.test(sourceSlot) ? Number(sourceSlot) : -1
                if (fromIndex >= 0 && fromIndex !== index) machineApi.swapPowerSlots?.(fromIndex, index)
              }}
            >
              <span className="armoryMachineRackKey" aria-hidden="true">{index + 1}</span>
              <span className="armoryMachineRackGlyph" aria-hidden="true">
                <PowerEmblem powerupId={powerSlot.id} size={28} />
              </span>
              <span className="armoryMachineRackBody">
                <strong className="armoryMachineRackLabel">{powerSlot.label}</strong>
                <span className="armoryMachineRackMeta">{powerSlot.cadenceLabel}</span>
              </span>
            </button>
          ))}
        </div>

      </div>
    </section>
  )
}
