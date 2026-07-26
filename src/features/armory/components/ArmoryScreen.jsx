import { useState } from "react"
import { Link } from "react-router-dom"

import {
  LOADOUT_POWERUPS,
  MODULE_SLOTS,
  getPassiveModuleById,
  getPowerupById,
} from "../../../constants/buildcraft.js"
import {
  getModuleOptionPresentation,
  getPowerupOptionPresentation,
} from "../../../constants/buildcraftPresentation.js"
import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import {
  getModuleExactChips,
  getPowerupExactChips,
} from "../armoryUtils.js"
import ArmoryBayWall from "./ArmoryBayWall.jsx"
import ArmoryCadenceTimeline from "./ArmoryCadenceTimeline.jsx"
import ArmoryCompareBench from "./ArmoryCompareBench.jsx"
import ArmoryInstruments from "./ArmoryInstruments.jsx"
import ArmoryMachine from "./ArmoryMachine.jsx"
import ArmoryPartsGallery from "./ArmoryPartsGallery.jsx"
import ArmorySpecSheet from "./ArmorySpecSheet.jsx"
import ArmoryTestRange from "./ArmoryTestRange.jsx"
import ArmoryUnlockCeremony from "./ArmoryUnlockCeremony.jsx"
import ArmoryUnlockWall from "./ArmoryUnlockWall.jsx"
import ArmoryStateEmblem from "./ArmoryStateEmblem.jsx"
import {
  ArmoryDetailPanel,
  ArmoryFirstTouchTip,
  ArmoryHotbarButton,
  ArmoryRailStepButton,
  ArmoryStepCard,
  ReviewModeButton,
} from "./ArmorySharedUiComponents.jsx"
import ArmoryWalkthroughOverlay from "./ArmoryWalkthroughOverlay.jsx"

export default function ArmoryScreen({
  shellRef,
  workspaceRef,
  nameplateRef,
  machineRef,
  passiveLaneRef,
  hotbarEditorRef,
  reviewPanelRef,
  steps,
  activeStepId,
  handleOpenStep,
  playerLevel,
  selectedMode,
  activeLoadout,
  activePresentation,
  machineApi,
  bayApi,
  passiveApi,
  hotbarApi,
  reviewApi,
  rangeApi,
  specSheetApi,
  compareApi,
  walkthroughApi,
  firstTouchApi,
  unlockWallApi,
  ceremonyApi,
  blueprintApi,
}) {
  // Identity drives the scene's lighting "weather" (see armory.css data-identity rules).
  const sceneIdentity = (activePresentation.identity.label || "Balanced").toLowerCase()

  // Which rack key is mid-drag, so its tab reads as lifted off the rack.
  const [draggedKeyIndex, setDraggedKeyIndex] = useState(null)

  // Inspection footer for the passive parts gallery: previewed part wins over
  // the installed one so hovering answers "what would I get?" before commit.
  const installedModuleId = activeLoadout.moduleIds?.[passiveApi.selectedModuleSlot.key] ?? ""
  const inspectedModuleId = passiveApi.previewedModuleId ?? installedModuleId
  const inspectedModule = getPassiveModuleById(inspectedModuleId)
  const inspectedModuleCopy = getModuleOptionPresentation(inspectedModule?.id)

  // Same contract for the tool rack, plus the cadence recomputed for the
  // previewed arrangement (buildRoundRules applies powerupAwardMultiplier).
  const inspectedPowerId = hotbarApi.previewedPowerId ?? hotbarApi.selectedPowerupId
  const inspectedPower = getPowerupById(inspectedPowerId)
  const inspectedPowerCopy = getPowerupOptionPresentation(inspectedPowerId)
  const editingSlotPresentation = (hotbarApi.previewPresentation ?? activePresentation)
    .powerSlots?.[hotbarApi.editingPowerSlotIndex] ?? null

  // Powers racked on another key stay live in the gallery and install as a swap.
  const powerParts = LOADOUT_POWERUPS.map((powerup) => {
    const rackedIndex = activeLoadout.powerupIds.indexOf(powerup.id)

    return {
      ...powerup,
      rackedOnKey: rackedIndex !== -1 && rackedIndex !== hotbarApi.editingPowerSlotIndex
        ? rackedIndex + 1
        : null,
    }
  })

  return (
    <div className="armoryScene armoryPage" data-identity={sceneIdentity} ref={shellRef}>
      <div className="armorySceneBackdrop" aria-hidden="true" />
      <aside className="armoryRail">
        <div className="armoryRailTop">
          <h1 className="armoryRailEyebrow">Armory</h1>
          <div className="armoryRailHeading">
            <strong>Build bays</strong>
            <span>Choose the loadout you want to configure.</span>
          </div>
        </div>

        <ArmoryBayWall bayApi={bayApi} blueprintApi={blueprintApi} />

        <div className="armoryRailActions">
          <span className="armoryRailActionLabel">Workshop utilities</span>
          <button type="button" className="secondaryButton" onClick={unlockWallApi.open}>
            Unlock Wall
          </button>
          <details className="armoryRailHelp">
            <summary>Workshop help</summary>
            <div className="armoryRailHelpPanel">
              <p>Replay the guided build tour when you need a refresher.</p>
              <button type="button" className="secondaryButton" onClick={() => walkthroughApi.open("manual")}>
                Restart Walkthrough
              </button>
            </div>
          </details>
          <Link className="secondaryButton secondaryButton-lg" to="/game">
            Back to Game
          </Link>
        </div>
      </aside>

      <header className="armoryCommandBar">
        <div className="armoryCommandIdentity">
          <span className="armoryCommandIdentityGlyph" aria-hidden="true">
            <BuildIdentityGlyph
              identity={activePresentation.identity.label}
              className="armoryRailIdentityGlyphIcon"
            />
          </span>
          <div className="armoryRailIdentityCopy">
            <span className="armoryRailLabel">Active build</span>
            <strong className="armoryCommandName">{activeLoadout.name}</strong>
            <span className="armoryRailHint">Changes save instantly to this bay.</span>
          </div>
        </div>

        <nav className="armoryWorkflow" aria-label="Armory steps" aria-describedby="armory-workflow-help">
          <span className="armoryWorkflowLabel">Build setup</span>
          <span id="armory-workflow-help" className="armoryVisuallyHidden">
            Choose mods, equip powerups, or test the active build.
          </span>
          <div className="armoryRailProgress">
            {steps.map((step, index) => (
              <ArmoryRailStepButton
                key={step.id}
                step={step}
                index={index}
                isActive={step.id === activeStepId}
                onClick={() => handleOpenStep(step.id)}
              />
            ))}
          </div>
        </nav>

        <div className="armoryCommandAction">
          <span className="armoryRailLabel">Ready?</span>
          <Link className="primaryButton" to="/game">Play</Link>
        </div>
      </header>

      <ArmoryMachine
        loadout={activeLoadout}
        presentation={activePresentation}
        nameplateRef={nameplateRef}
        machineRef={machineRef}
        machineApi={machineApi}
      />

      <div className="armoryWorkspace" ref={workspaceRef}>
        <ArmoryInstruments
          presentation={activePresentation}
          previewPresentation={passiveApi.previewPresentation}
        />

        <div className="armoryStepStack">
          {activeStepId === "passives" ? (
          <ArmoryStepCard
            step={steps[0]}
            summary={passiveApi.summary}
          >
            <div className="armoryLaneTabs" aria-label="Passive systems">
              {MODULE_SLOTS.map((slot) => {
                const selectedModuleId = activeLoadout.moduleIds?.[slot.key]
                const selectedModuleOption = getPassiveModuleById(selectedModuleId)

                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`armoryLaneTab ${slot.id === passiveApi.selectedModuleSlot.id ? "isActive" : ""} tone-${slot.id}`}
                    onClick={() => passiveApi.setActiveModuleSlotId(slot.id)}
                  >
                    <span className={`armoryLaneTabIcon tone-${slot.id}`} aria-hidden="true">
                      <ModuleSlotGlyph slotId={slot.id} />
                    </span>
                    <span className="armoryLaneTabBody">
                      <strong className="armoryLaneTabLabel">{slot.label}</strong>
                      <span className="armoryLaneTabMeta">{selectedModuleOption?.label ?? slot.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className={`armoryLanePanel tone-${passiveApi.selectedModuleSlot.id}`} ref={passiveLaneRef}>
              <div className="armoryLanePanelHeader">
                <span className={`armoryLanePanelIcon tone-${passiveApi.selectedModuleSlot.id}`} aria-hidden="true">
                  <ModuleSlotGlyph slotId={passiveApi.selectedModuleSlot.id} />
                </span>
                <div className="armoryLanePanelCopy">
                  <h3 className="armoryLanePanelTitle">{passiveApi.selectedModuleSlot.label}</h3>
                  <p className="armoryLanePanelLead">{passiveApi.selectedModuleSlot.description}</p>
                </div>
              </div>

              <ArmoryPartsGallery
                tone={passiveApi.selectedModuleSlot.id}
                galleryLabel={`${passiveApi.selectedModuleSlot.label} parts`}
                parts={passiveApi.moduleOptionsBySlot[passiveApi.selectedModuleSlot.id]}
                playerLevel={playerLevel}
                installedPartId={installedModuleId}
                previewedPartId={passiveApi.previewedModuleId}
                renderPartGlyph={() => <ModuleSlotGlyph slotId={passiveApi.selectedModuleSlot.id} />}
                onPreviewPart={passiveApi.previewModule}
                onClearPreview={passiveApi.clearPreview}
                onInstallPart={(moduleId) => passiveApi.selectModule(passiveApi.selectedModuleSlot.key, moduleId)}
                onInspectLockedPart={firstTouchApi.notifyLockedPart}
                footer={(
                  <ArmoryDetailPanel
                    eyebrow={inspectedModuleId !== installedModuleId ? "Previewing part" : "Installed part"}
                    title={inspectedModule?.label ?? passiveApi.selectedModuleSlot.label}
                    lead={inspectedModuleCopy.youGet}
                    rows={[
                      { label: "Tradeoff", value: inspectedModuleCopy.youGiveUp },
                      { label: "Best in", value: inspectedModuleCopy.bestIn },
                    ]}
                    exactChips={getModuleExactChips(inspectedModule)}
                  />
                )}
              />
            </div>
          </ArmoryStepCard>
          ) : null}

          {activeStepId === "hotbar" ? (
          <ArmoryStepCard
            step={steps[1]}
            summary={hotbarApi.summary}
          >
            <div className="armoryHotbarEditor" ref={hotbarEditorRef}>
              <div className="armoryHotbarTabs" aria-label="Powerup keys">
                {activePresentation.powerSlots.map((powerSlot, index) => (
                  <ArmoryHotbarButton
                    key={`${powerSlot.id}-${index + 1}`}
                    powerupId={powerSlot.id}
                    index={index}
                    cadenceLabel={powerSlot.cadenceLabel}
                    isActive={hotbarApi.editingPowerSlotIndex === index}
                    isDragging={draggedKeyIndex === index}
                    onClick={() => hotbarApi.setEditingPowerSlotIndex(index)}
                    dragProps={{
                      draggable: true,
                      onDragStart: (event) => {
                        setDraggedKeyIndex(index)
                        event.dataTransfer.setData("text/plain", String(index))
                        event.dataTransfer.effectAllowed = "move"
                      },
                      onDragEnd: () => setDraggedKeyIndex(null),
                      onDragOver: (event) => event.preventDefault(),
                      onDrop: (event) => {
                        event.preventDefault()
                        setDraggedKeyIndex(null)
                        const fromIndex = Number(event.dataTransfer.getData("text/plain"))
                        if (Number.isInteger(fromIndex)) hotbarApi.swapPowerSlots(fromIndex, index)
                      },
                    }}
                  />
                ))}
              </div>

              <ArmoryPartsGallery
                tone="power"
                galleryLabel="Powerups"
                parts={powerParts}
                playerLevel={playerLevel}
                installedPartId={hotbarApi.selectedPowerupId}
                previewedPartId={hotbarApi.previewedPowerId}
                renderPartGlyph={(part) => <PowerupGlyph powerupId={part.id} />}
                onPreviewPart={hotbarApi.previewPower}
                onClearPreview={hotbarApi.clearPreview}
                onInstallPart={hotbarApi.installPower}
                onInspectLockedPart={firstTouchApi.notifyLockedPart}
                footer={(
                  <>
                    <ArmoryCadenceTimeline
                      powerSlots={activePresentation.powerSlots}
                      previewPowerSlots={hotbarApi.previewPresentation?.powerSlots ?? null}
                      startingCharges={activePresentation.roundRules.startingPowerupCharges}
                    />
                    <ArmoryDetailPanel
                      eyebrow={`Key ${hotbarApi.editingPowerSlotIndex + 1}`}
                      title={inspectedPower?.label ?? "Choose a powerup"}
                      lead={inspectedPowerCopy.youGet}
                      rows={[
                        { label: "Tradeoff", value: inspectedPowerCopy.youGiveUp },
                        { label: "Best in", value: inspectedPowerCopy.bestIn },
                      ]}
                      exactChips={getPowerupExactChips(
                        inspectedPower,
                        editingSlotPresentation?.awardEvery ?? inspectedPower?.awardEvery ?? 0
                      )}
                    />
                  </>
                )}
              />
            </div>
          </ArmoryStepCard>
          ) : null}

          {activeStepId === "review" ? (
          <ArmoryStepCard
            step={steps[2]}
            summary={reviewApi.summary}
          >
            <div className="armoryRangeLauncher" ref={reviewPanelRef}>
              <div className="armoryReviewModeRow" aria-label="Game mode">
                {reviewApi.modes.map((mode) => (
                  <ReviewModeButton
                    key={mode.id}
                    mode={mode}
                    isActive={mode.id === selectedMode.id}
                    onClick={() => reviewApi.onModeChange?.(mode.id)}
                  />
                ))}
              </div>

              <section className="armoryRangeLauncherHero">
                <div className="armoryRangeLauncherCopy">
                  <p className="armoryReviewEyebrow">{selectedMode.label} rules</p>
                  <h3 className="armoryReviewTitle">Test {activeLoadout.name}</h3>
                  <p className="armoryReviewLead">
                    Try a 10-second run with your current mods and powerups.
                  </p>
                  <p className="armoryReviewNote">No XP, no coins, no rank — nothing is saved.</p>
                </div>
                <div className="armoryRangeLauncherActions">
                  <button type="button" className="primaryButton" onClick={rangeApi.open}>
                    Start test run
                  </button>
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={specSheetApi.open}
                  >
                    Build details
                  </button>
                </div>
              </section>
              <section className="armoryRangeReadiness" aria-label={`${activeLoadout.name} test run readiness`}>
                <ArmoryStateEmblem state="ready" label="Ready to test" />
                <div className="armoryRangeReadinessTrack" aria-hidden="true">
                  <span className="isReady" />
                  <span className="isReady" />
                  <span className="isReady" />
                </div>
                <div className="armoryRangeReadinessChecks">
                  <span><strong>3/3</strong> mods equipped</span>
                  <span><strong>3/3</strong> powerups equipped</span>
                  <span><strong>{selectedMode.label}</strong> rules loaded</span>
                </div>
              </section>
            </div>
          </ArmoryStepCard>
          ) : null}
        </div>
      </div>

      <ArmorySpecSheet
        isOpen={specSheetApi.isOpen}
        onClose={specSheetApi.close}
        loadoutName={activeLoadout.name}
        modeLabel={selectedMode.label}
        presentation={activePresentation}
        showDetails={specSheetApi.showDetails}
        onToggleDetails={specSheetApi.setShowDetails}
        loadoutStats={specSheetApi.loadoutStats}
      />

      <ArmoryTestRange
        isOpen={rangeApi.isOpen}
        roundRules={activePresentation.roundRules}
        modeLabel={selectedMode.label}
        loadoutName={activeLoadout.name}
        runToken={rangeApi.runToken}
        onRunAgain={rangeApi.runAgain}
        onExit={rangeApi.close}
        arenaThemeClass={rangeApi.arenaThemeClass}
        buttonSkinClass={rangeApi.buttonSkinClass}
        buttonSkinImageSrc={rangeApi.buttonSkinImageSrc}
        buttonSkinImageScale={rangeApi.buttonSkinImageScale}
      />

      <ArmoryCompareBench
        isOpen={compareApi.isOpen}
        onClose={compareApi.close}
        view={compareApi.view}
        onChangeView={compareApi.setView}
        modeLabel={selectedMode.label}
        activeLoadout={activeLoadout}
        activePresentation={activePresentation}
        ghostLoadout={compareApi.ghostLoadout}
        ghostPresentation={compareApi.ghostPresentation}
        modePresentations={compareApi.modePresentations}
      />

      <ArmoryWalkthroughOverlay
        step={walkthroughApi.currentStep}
        stepIndex={walkthroughApi.stepIndex}
        stepCount={walkthroughApi.stepCount}
        spotlightRect={walkthroughApi.spotlightRect}
        selectedModeLabel={selectedMode.label}
        isManual={walkthroughApi.source === "manual"}
        onSkip={walkthroughApi.close}
        onBack={walkthroughApi.goBack}
        onNext={walkthroughApi.goNext}
        onKeepCurrentName={walkthroughApi.keepCurrentName}
        onSaveName={walkthroughApi.saveName}
        onGoToReady={walkthroughApi.goToReady}
        onRunRange={walkthroughApi.runRange}
      />

      <ArmoryFirstTouchTip
        message={firstTouchApi.activeTipMessage}
        onDismiss={firstTouchApi.dismiss}
      />

      <ArmoryUnlockWall
        isOpen={unlockWallApi.isOpen}
        onClose={unlockWallApi.close}
        playerLevel={playerLevel}
        activeLoadout={activeLoadout}
      />

      <ArmoryUnlockCeremony
        part={ceremonyApi.part}
        parts={ceremonyApi.parts}
        remainingCount={ceremonyApi.remainingCount}
        onInstallNow={ceremonyApi.installNow}
        onRackIt={ceremonyApi.rackIt}
        onSkipAll={ceremonyApi.skipAll}
      />
    </div>
  )
}
