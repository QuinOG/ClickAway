import { Link } from "react-router-dom"

import {
  LOADOUT_POWERUPS,
  MODULE_SLOTS,
  getPassiveModuleById,
} from "../../../constants/buildcraft.js"
import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import {
  formatSignedPercent,
  getModuleExactChips,
  getPowerupExactChips,
  getUnlockText,
} from "../armoryUtils.js"
import {
  ArmoryChoiceCard,
  ArmoryDetailPanel,
  ArmoryHotbarButton,
  ArmoryRailStepButton,
  ArmorySlotRailButton,
  ArmoryStepCard,
  ReviewModeButton,
} from "./ArmorySharedUiComponents.jsx"
import ArmoryWalkthroughOverlay from "./ArmoryWalkthroughOverlay.jsx"

export default function ArmoryScreen({
  shellRef,
  workspaceRef,
  slotEditorRef,
  passiveLaneRef,
  hotbarEditorRef,
  reviewPanelRef,
  ARMORY_STEPS,
  localSavedLoadouts,
  loadoutPresentations,
  localActiveLoadoutId,
  activeStepId,
  activeModuleSlotId,
  setActiveModuleSlotId,
  editingPowerSlotIndex,
  setEditingPowerSlotIndex,
  nameDraft,
  setNameDraft,
  showReviewDetails,
  setShowReviewDetails,
  currentWalkthroughStep,
  walkthroughStepIndex,
  walkthroughSpotlightRect,
  walkthroughSource,
  walkthroughStepCount,
  selectedMode,
  activeLoadout,
  activePresentation,
  selectedModuleSlot,
  moduleOptionsBySlot,
  selectedModule,
  selectedModuleCopy,
  selectedPowerupId,
  selectedPowerup,
  selectedPowerCopy,
  selectedPowerSlotPresentation,
  playerLevel,
  modes,
  onModeChange,
  commitActiveLoadoutName,
  handleOpenStep,
  handleActivateLoadout,
  handleResetLoadout,
  handleSelectModule,
  handleSelectPowerup,
  openWalkthrough,
  closeWalkthrough,
  goToPreviousWalkthroughStep,
  goToNextWalkthroughStep,
  handleWalkthroughKeepCurrentName,
  handleWalkthroughSaveName,
  handleWalkthroughGoToReady,
  handleWalkthroughKeepTuning,
  slotStepSummary,
  passiveStepSummary,
  hotbarStepSummary,
  reviewStepSummary,
}) {
  return (
    <div className="pageCenter armoryPage">
      <section className="cardWide armoryShell" ref={shellRef}>
        <aside className="armoryRail">
          <div className="armoryRailTop">
            <p className="armoryRailEyebrow">Armory</p>
            <div className="armoryRailIdentity">
              <span className="armoryRailIdentityGlyph" aria-hidden="true">
                <BuildIdentityGlyph
                  identity={activePresentation.identity.label}
                  className="armoryRailIdentityGlyphIcon"
                />
              </span>
              <div className="armoryRailIdentityCopy">
                <span className="armoryRailLabel">Active build</span>
                <strong className="armoryRailName">{activeLoadout.name}</strong>
                <span className="armoryRailHint">Saves instantly. Ready uses this slot next round.</span>
              </div>
            </div>
          </div>

          <div className="armoryRailProgress" aria-label="Armory steps">
            {ARMORY_STEPS.map((step, index) => (
              <ArmoryRailStepButton
                key={step.id}
                step={step}
                index={index}
                isActive={step.id === activeStepId}
                onClick={() => handleOpenStep(step.id)}
              />
            ))}
          </div>

          <div className="armoryRailSection">
            <span className="armoryRailSectionLabel">Saved builds</span>
            <div className="armorySlotRailList" aria-label="Saved build slots">
              {localSavedLoadouts.map((loadout, index) => (
                <ArmorySlotRailButton
                  key={loadout.id}
                  loadout={loadout}
                  index={index}
                  presentation={loadoutPresentations[loadout.id]}
                  isActive={loadout.id === localActiveLoadoutId}
                  onClick={() => handleActivateLoadout(loadout.id)}
                />
              ))}
            </div>
          </div>

          <div className="armoryRailActions">
            <button type="button" className="secondaryButton" onClick={() => openWalkthrough("manual")}>
              Restart Walkthrough
            </button>
            <Link className="secondaryButton secondaryButton-lg" to="/game">
              Back to Game
            </Link>
          </div>
        </aside>

        <div className="armoryWorkspace" ref={workspaceRef}>
          <div className="armoryStepStack">
            <ArmoryStepCard
              step={ARMORY_STEPS[0]}
              index={0}
              summary={slotStepSummary}
              isActive={activeStepId === "slot"}
              onActivate={() => handleOpenStep("slot")}
            >
              <div className="armorySlotEditor" ref={slotEditorRef}>
                <label className="armoryField" htmlFor="armory-build-name">
                  <span className="armoryFieldLabel">Build name</span>
                  <input
                    id="armory-build-name"
                    className="armoryNameInput"
                    value={nameDraft}
                    maxLength={24}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onBlur={commitActiveLoadoutName}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        commitActiveLoadoutName()
                        event.currentTarget.blur()
                      }
                    }}
                  />
                </label>

                <div className="armoryStatusRow">
                  <span className="armoryStatusChip">Active in Ready</span>
                  <span className="armoryStatusChip">{activePresentation.identity.label}</span>
                </div>

                <div className="armoryActionRow">
                  <button type="button" className="secondaryButton" onClick={handleResetLoadout}>
                    Reset This Slot
                  </button>
                </div>

                <div className="armorySnapshotGrid" aria-label="Current build snapshot">
                  <section className="armorySnapshotPanel">
                    <span className="armorySnapshotLabel">Passive stack</span>
                    <div className="armoryChipRow">
                      {activePresentation.moduleStack.map((module) => (
                        <span key={module.slotKey} className={`armorySnapshotChip tone-${module.slotId}`}>
                          <ModuleSlotGlyph slotId={module.slotId} className="armorySnapshotChipIcon" />
                          {module.label}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="armorySnapshotPanel">
                    <span className="armorySnapshotLabel">Hotbar</span>
                    <div className="armoryChipRow">
                      {activePresentation.powerSlots.map((powerSlot, index) => (
                        <span key={`${powerSlot.id}-${index + 1}`} className="armorySnapshotChip tone-power">
                          <span className="armorySnapshotKey">{index + 1}</span>
                          <PowerupGlyph powerupId={powerSlot.id} className="armorySnapshotChipIcon" />
                          {powerSlot.label}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </ArmoryStepCard>

            <ArmoryStepCard
              step={ARMORY_STEPS[1]}
              index={1}
              summary={passiveStepSummary}
              isActive={activeStepId === "passives"}
              onActivate={() => handleOpenStep("passives")}
            >
              <div className="armoryLaneTabs" aria-label="Passive systems">
                {MODULE_SLOTS.map((slot) => {
                  const selectedModuleId = activeLoadout.moduleIds?.[slot.key]
                  const selectedModuleOption = getPassiveModuleById(selectedModuleId)

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className={`armoryLaneTab ${slot.id === selectedModuleSlot.id ? "isActive" : ""} tone-${slot.id}`}
                      onClick={() => setActiveModuleSlotId(slot.id)}
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

              <div className={`armoryLanePanel tone-${selectedModuleSlot.id}`} ref={passiveLaneRef}>
                <div className="armoryLanePanelHeader">
                  <span className={`armoryLanePanelIcon tone-${selectedModuleSlot.id}`} aria-hidden="true">
                    <ModuleSlotGlyph slotId={selectedModuleSlot.id} />
                  </span>
                  <div className="armoryLanePanelCopy">
                    <h3 className="armoryLanePanelTitle">{selectedModuleSlot.label}</h3>
                    <p className="armoryLanePanelLead">{selectedModuleSlot.description}</p>
                  </div>
                </div>

                <div className="armoryChoiceGrid">
                  {moduleOptionsBySlot[selectedModuleSlot.id].map((module) => {
                    const isLocked = playerLevel < module.unlockLevel
                    const hint = isLocked
                      ? getUnlockText(module.unlockLevel)
                      : activeLoadout.moduleIds?.[selectedModuleSlot.key] === module.id
                        ? "Equipped"
                        : ""

                    return (
                      <ArmoryChoiceCard
                        key={module.id}
                        tone={`tone-${selectedModuleSlot.id}`}
                        icon={<ModuleSlotGlyph slotId={selectedModuleSlot.id} />}
                        label={module.label}
                        impact={module.description}
                        hint={hint}
                        isSelected={activeLoadout.moduleIds?.[selectedModuleSlot.key] === module.id}
                        isDisabled={isLocked}
                        onClick={() => handleSelectModule(selectedModuleSlot.key, module.id)}
                      />
                    )
                  })}
                </div>

                <ArmoryDetailPanel
                  eyebrow="Selected passive"
                  title={selectedModule?.label ?? selectedModuleSlot.label}
                  lead={selectedModuleCopy.youGet}
                  rows={[
                    { label: "Tradeoff", value: selectedModuleCopy.youGiveUp },
                    { label: "Best in", value: selectedModuleCopy.bestIn },
                  ]}
                  exactChips={getModuleExactChips(selectedModule)}
                />
              </div>
            </ArmoryStepCard>

            <ArmoryStepCard
              step={ARMORY_STEPS[2]}
              index={2}
              summary={hotbarStepSummary}
              isActive={activeStepId === "hotbar"}
              onActivate={() => handleOpenStep("hotbar")}
            >
              <div className="armoryHotbarEditor" ref={hotbarEditorRef}>
                <div className="armoryHotbarTabs" aria-label="Hotbar slots">
                  {activePresentation.powerSlots.map((powerSlot, index) => (
                    <ArmoryHotbarButton
                      key={`${powerSlot.id}-${index + 1}`}
                      powerupId={powerSlot.id}
                      index={index}
                      cadenceLabel={powerSlot.cadenceLabel}
                      isActive={editingPowerSlotIndex === index}
                      onClick={() => setEditingPowerSlotIndex(index)}
                    />
                  ))}
                </div>

                <div className="armoryChoiceGrid armoryChoiceGrid-powers">
                  {LOADOUT_POWERUPS.map((powerup) => {
                    const isLocked = playerLevel < powerup.unlockLevel
                    const takenSlotIndex = activeLoadout.powerupIds.findIndex((equippedId, index) => (
                      index !== editingPowerSlotIndex && equippedId === powerup.id
                    ))
                    const isSelected = selectedPowerupId === powerup.id
                    const isTakenElsewhere = takenSlotIndex !== -1
                    const isDisabled = isLocked || isTakenElsewhere
                    let hint = `Key ${editingPowerSlotIndex + 1}`

                    if (isLocked) {
                      hint = getUnlockText(powerup.unlockLevel)
                    } else if (isTakenElsewhere && !isSelected) {
                      hint = `On key ${takenSlotIndex + 1}`
                    } else if (isSelected) {
                      hint = "Equipped"
                    }

                    return (
                      <ArmoryChoiceCard
                        key={powerup.id}
                        tone="tone-power"
                        icon={<PowerupGlyph powerupId={powerup.id} />}
                        label={powerup.label}
                        impact={powerup.description}
                        hint={hint}
                        isSelected={isSelected}
                        isDisabled={isDisabled}
                        onClick={() => handleSelectPowerup(powerup.id)}
                      />
                    )
                  })}
                </div>

                <ArmoryDetailPanel
                  eyebrow={`Key ${editingPowerSlotIndex + 1}`}
                  title={selectedPowerup?.label ?? "Choose Power"}
                  lead={selectedPowerCopy.youGet}
                  rows={[
                    { label: "Tradeoff", value: selectedPowerCopy.youGiveUp },
                    { label: "Best in", value: selectedPowerCopy.bestIn },
                    {
                      label: "Charge",
                      value: selectedPowerSlotPresentation?.cadenceLabel ?? "No cadence",
                    },
                  ]}
                  exactChips={getPowerupExactChips(
                    selectedPowerup,
                    selectedPowerSlotPresentation?.awardEvery ?? selectedPowerup?.awardEvery ?? 0
                  )}
                />
              </div>
            </ArmoryStepCard>

            <ArmoryStepCard
              step={ARMORY_STEPS[3]}
              index={3}
              summary={reviewStepSummary}
              isActive={activeStepId === "review"}
              onActivate={() => handleOpenStep("review")}
            >
              <div ref={reviewPanelRef}>
                <div className="armoryReviewModeRow" aria-label="Mode preview">
                  {modes.map((mode) => (
                    <ReviewModeButton
                      key={mode.id}
                      mode={mode}
                      isActive={mode.id === selectedMode.id}
                      onClick={() => onModeChange?.(mode.id)}
                    />
                  ))}
                </div>

                <section className="armoryReviewHero">
                  <div className="armoryReviewHeroCopy">
                    <p className="armoryReviewEyebrow">Current mode</p>
                    <h3 className="armoryReviewTitle">
                      {selectedMode.label} / {activeLoadout.name}
                    </h3>
                    <p className="armoryReviewLead">{activePresentation.glanceText}</p>
                    <p className="armoryReviewNote">{activePresentation.bestFor}</p>
                  </div>
                  <button
                    type="button"
                    className="secondaryButton armoryReviewToggle"
                    onClick={() => setShowReviewDetails((currentValue) => !currentValue)}
                    aria-expanded={showReviewDetails}
                  >
                    {showReviewDetails ? "Hide Exact Values" : "Show Exact Values"}
                  </button>
                </section>

                <div className="armoryReviewMetrics" aria-label="Mode simulation metrics">
                  {activePresentation.summaryStats.map((stat) => (
                    <article key={stat.label} className="armoryMetricCard">
                      <span className="armoryMetricLabel">{stat.label}</span>
                      <strong className="armoryMetricValue">{stat.value}</strong>
                    </article>
                  ))}
                </div>

                <div className="armoryReviewGrid">
                  <section className="armoryReviewPanel">
                    <span className="armoryReviewPanelTitle">Strengths</span>
                    <div className="armoryChipRow">
                      {activePresentation.strengths.map((item) => (
                        <span key={item} className="armorySnapshotChip tone-good">{item}</span>
                      ))}
                    </div>
                  </section>

                  <section className="armoryReviewPanel">
                    <span className="armoryReviewPanelTitle">Tradeoffs</span>
                    <div className="armoryChipRow">
                      {activePresentation.tradeoffs.map((item) => (
                        <span key={item} className="armorySnapshotChip tone-risk">{item}</span>
                      ))}
                    </div>
                  </section>

                  <section className="armoryReviewPanel">
                    <span className="armoryReviewPanelTitle">Hotbar cadence</span>
                    <div className="armoryReviewPowerList">
                      {activePresentation.powerSlots.map((powerSlot, index) => (
                        <div key={`${powerSlot.id}-${index + 1}`} className="armoryReviewPowerItem">
                          <span className="armoryReviewPowerKey">{index + 1}</span>
                          <span className="armoryReviewPowerGlyph" aria-hidden="true">
                            <PowerupGlyph powerupId={powerSlot.id} />
                          </span>
                          <span className="armoryReviewPowerBody">
                            <strong className="armoryReviewPowerLabel">{powerSlot.label}</strong>
                            <span className="armoryReviewPowerMeta">{powerSlot.cadenceLabel}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {showReviewDetails ? (
                  <section className="armoryReviewDetails">
                    <div className="armoryDetailRows">
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Start size</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.initialButtonSize}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Min size</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.minButtonSize}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Shrink factor</span>
                        <span className="armoryDetailValue">{Number(activePresentation.roundRules.shrinkFactor).toFixed(2)}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Combo step</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.comboStep}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Miss penalty</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.missPenalty}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Score multiplier</span>
                        <span className="armoryDetailValue">{formatSignedPercent(activePresentation.roundRules.scoreMultiplier)}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Charge rate</span>
                        <span className="armoryDetailValue">x{Number(activePresentation.roundRules.powerupAwardMultiplier).toFixed(2)}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Starting charges</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.startingPowerupCharges}</span>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            </ArmoryStepCard>
          </div>
        </div>

        <ArmoryWalkthroughOverlay
          step={currentWalkthroughStep}
          stepIndex={walkthroughStepIndex}
          stepCount={walkthroughStepCount}
          spotlightRect={walkthroughSpotlightRect}
          selectedModeLabel={selectedMode.label}
          isManual={walkthroughSource === "manual"}
          onSkip={closeWalkthrough}
          onBack={goToPreviousWalkthroughStep}
          onNext={goToNextWalkthroughStep}
          onKeepCurrentName={handleWalkthroughKeepCurrentName}
          onSaveName={handleWalkthroughSaveName}
          onGoToReady={handleWalkthroughGoToReady}
          onKeepTuning={handleWalkthroughKeepTuning}
        />
      </section>
    </div>
  )
}
