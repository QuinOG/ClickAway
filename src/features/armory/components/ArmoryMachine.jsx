import { MODULE_SLOTS } from "../../../constants/buildcraft.js"
import { PartEmblem, PowerEmblem } from "../../../components/art/GameIcons.jsx"

const DEFAULT_MODULE_ID_BY_SLOT_ID = Object.fromEntries(
  MODULE_SLOTS.map((slot) => [slot.id, slot.defaultModuleId])
)

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

function MachineNameplate({ loadout, nameplateRef, machineApi }) {
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
  return (
    <section className="armoryStage" aria-label="Active build machine">
      {/* Keyed by bay so switching bays rolls a fresh machine onto the stage
          (reduced motion crossfades instead — see armory.css). */}
      <div className="armoryMachine" key={loadout.id} ref={machineRef}>
        {/* Keep the editable name and build tools together. */}
        <header className="armoryMachineHeader">
          <MachineNameplate
            loadout={loadout}
            nameplateRef={nameplateRef}
            machineApi={machineApi}
          />
          <MachineWorkshopActions machineApi={machineApi} />
        </header>

        <div className="armoryClassSheet">
          <div className="armoryClassFacts" aria-label="Target details">
            <p>Target size: <strong>{presentation.roundRules.initialButtonSize >= 100 ? "Big" : presentation.roundRules.initialButtonSize >= 80 ? "Medium" : "Small"}</strong></p>
            <p>Starts at {presentation.roundRules.initialButtonSize} pixels across.</p>
            <p>Shrinks with each hit, down to {presentation.roundRules.minButtonSize} pixels.</p>
          </div>
          <div className="armoryClassParts" aria-label="Passive stack">
            {presentation.moduleStack.map((module) => (
              <MachineHousing key={module.slotId} module={module}
                isSelected={machineApi.selectedModuleSlotId === module.slotId}
                onOpenLane={machineApi.openModuleLane} />
            ))}
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
