import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  DEFAULT_SAVED_LOADOUTS,
  LOADOUT_POWERUPS,
  MODULE_SLOTS,
  PASSIVE_LOADOUT_MODULES,
  getLoadoutById,
  getPowerupById,
} from "../constants/buildcraft.js"
import {
  buildLoadoutPresentation,
  getModuleOptionPresentation,
  getPowerupOptionPresentation,
} from "../constants/buildcraftPresentation.js"
import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../features/buildcraft/buildcraftGlyphs.jsx"

function getUnlockText(unlockLevel = 1) {
  return `Unlocks at Level ${unlockLevel}`
}

function TelemetryMeter({ label, value }) {
  return (
    <div className="armoryTelemetryRow">
      <div className="armoryTelemetryTop">
        <span className="armoryTelemetryLabel">{label}</span>
        <strong className="armoryTelemetryValue">{value}</strong>
      </div>
    </div>
  )
}

function LoadoutRailCard({
  loadout,
  index,
  presentation,
  isActive = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`armorySlotCard ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armorySlotGlyph" aria-hidden="true">
        <BuildIdentityGlyph
          identity={presentation?.identity.label}
          className="armoryIdentityGlyph armoryIdentityGlyph-slot"
        />
      </span>
      <div className="armorySlotBody">
        <span className="armorySlotLabel">Build {index + 1}</span>
        <strong className="armorySlotName">{loadout.name}</strong>
        <span className="armorySlotMeta">{presentation?.titleLine ?? "Balanced"}</span>
      </div>
    </button>
  )
}

function ModeSimButton({ mode, isActive = false, onClick }) {
  return (
    <button
      type="button"
      className={`armoryModeButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armoryModeButtonLabel">{mode.label}</span>
      <span className="armoryModeButtonMeta">
        {mode.isTimedRound === false ? "No timer" : `${mode.durationSeconds}s`} • Miss {mode.missPenalty}
      </span>
    </button>
  )
}

function BuildChoiceCard({
  tone = "",
  icon = null,
  label,
  hint = "",
  youGet = "",
  youGiveUp = "",
  bestIn = "",
  isSelected = false,
  isLocked = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`armoryChoiceCard ${tone} ${isSelected ? "isSelected" : ""} ${isLocked ? "isLocked" : ""}`}
      disabled={isLocked}
      onClick={onClick}
    >
      <div className="armoryChoiceHeader">
        <div className="armoryChoiceTitleRow">
          <span className="armoryChoiceIcon" aria-hidden="true">
            {icon}
          </span>
          <strong className="armoryChoiceLabel">{label}</strong>
        </div>
        {hint ? <span className="armoryChoiceMeta">{hint}</span> : null}
      </div>
      <div className="armoryChoiceCopy">
        <p><span>You get</span>{youGet}</p>
        <p><span>You give up</span>{youGiveUp}</p>
        <p><span>Best in</span>{bestIn}</p>
      </div>
    </button>
  )
}

function HotbarSlotButton({
  powerupId,
  index,
  cadenceLabel = "",
  isActive = false,
  onClick,
}) {
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
        <span className="armoryHotbarLabel">{powerup?.label ?? "Choose Power"}</span>
        <span className="armoryHotbarMeta">{cadenceLabel || "No cadence"}</span>
      </span>
    </button>
  )
}

export default function ArmoryPage({
  modes = [],
  selectedModeId = "",
  onModeChange,
  playerLevel = 1,
  savedLoadouts = [],
  activeLoadoutId = "",
  onLoadoutStateChange,
}) {
  const [localSavedLoadouts, setLocalSavedLoadouts] = useState(savedLoadouts)
  const [localActiveLoadoutId, setLocalActiveLoadoutId] = useState(activeLoadoutId)
  const [editingPowerSlotIndex, setEditingPowerSlotIndex] = useState(0)
  const [nameDraft, setNameDraft] = useState("")

  useEffect(() => {
    setLocalSavedLoadouts(savedLoadouts)
  }, [savedLoadouts])

  useEffect(() => {
    setLocalActiveLoadoutId(activeLoadoutId)
  }, [activeLoadoutId])

  const selectedMode = useMemo(() => (
    modes.find((mode) => mode.id === selectedModeId) ?? modes[0] ?? null
  ), [modes, selectedModeId])

  const activeLoadout = useMemo(
    () => getLoadoutById(localSavedLoadouts, localActiveLoadoutId),
    [localActiveLoadoutId, localSavedLoadouts]
  )

  useEffect(() => {
    setNameDraft(activeLoadout?.name ?? "")
    setEditingPowerSlotIndex(0)
  }, [activeLoadout])

  const moduleOptionsBySlot = useMemo(() => (
    Object.fromEntries(
      MODULE_SLOTS.map((slot) => [
        slot.id,
        PASSIVE_LOADOUT_MODULES.filter((module) => module.slotId === slot.id),
      ])
    )
  ), [])

  const loadoutPresentations = useMemo(() => {
    if (!selectedMode) return {}

    return Object.fromEntries(
      localSavedLoadouts.map((loadout) => [
        loadout.id,
        buildLoadoutPresentation(selectedMode, loadout),
      ])
    )
  }, [localSavedLoadouts, selectedMode])

  const activePresentation = activeLoadout?.id ? loadoutPresentations[activeLoadout.id] : null
  const selectedPowerupId = activeLoadout?.powerupIds?.[editingPowerSlotIndex] ?? ""

  function commitLoadoutState(nextSavedLoadouts, nextActiveLoadoutId = localActiveLoadoutId) {
    setLocalSavedLoadouts(nextSavedLoadouts)
    setLocalActiveLoadoutId(nextActiveLoadoutId)
    onLoadoutStateChange?.({
      savedLoadouts: nextSavedLoadouts,
      activeLoadoutId: nextActiveLoadoutId,
    })
  }

  function updateSingleLoadout(targetLoadoutId, recipe) {
    const nextSavedLoadouts = localSavedLoadouts.map((loadout) => (
      loadout.id === targetLoadoutId ? recipe(loadout) : loadout
    ))
    commitLoadoutState(nextSavedLoadouts)
  }

  function handleActivateLoadout(nextLoadoutId) {
    if (!nextLoadoutId || nextLoadoutId === localActiveLoadoutId) return
    commitLoadoutState(localSavedLoadouts, nextLoadoutId)
  }

  function commitActiveLoadoutName() {
    if (!activeLoadout) return

    const normalizedName = String(nameDraft || "").trim().replace(/\s+/g, " ").slice(0, 24)
    const nextName = normalizedName || activeLoadout.name

    if (nextName === activeLoadout.name) return

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      name: nextName,
    }))
  }

  function handleSelectModule(slotKey, moduleId) {
    if (!activeLoadout) return

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      moduleIds: {
        ...loadout.moduleIds,
        [slotKey]: moduleId,
      },
    }))
  }

  function handleSelectPowerup(powerupId) {
    if (!activeLoadout) return

    const nextPowerupIds = [...activeLoadout.powerupIds]
    nextPowerupIds[editingPowerSlotIndex] = powerupId

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      powerupIds: nextPowerupIds,
    }))
  }

  function handleResetLoadout() {
    if (!activeLoadout) return

    const starterLoadout = DEFAULT_SAVED_LOADOUTS.find((loadout) => loadout.id === activeLoadout.id)
    if (!starterLoadout) return

    setNameDraft(starterLoadout.name)
    updateSingleLoadout(activeLoadout.id, () => ({
      id: starterLoadout.id,
      name: starterLoadout.name,
      moduleIds: { ...starterLoadout.moduleIds },
      powerupIds: [...starterLoadout.powerupIds],
    }))
  }

  if (!selectedMode || !activeLoadout || !activePresentation) {
    return null
  }

  return (
    <div className="pageCenter armoryPage">
      <section className="cardWide armoryShell">
        <aside className="armoryRail">
          <div className="armoryRailTop">
            <p className="armoryEyebrow">Armory</p>
            <h1 className="armoryTitle">Build Studio</h1>
            <p className="armoryLead">
              Tune your build here, then jump back to Ready when you just want to pick and play.
            </p>
          </div>

          <div className="armoryIdentityBlock">
            <div className="armoryIdentityGlyphWrap" aria-hidden="true">
              <BuildIdentityGlyph
                identity={activePresentation.identity.label}
                className="armoryIdentityGlyph"
              />
            </div>
            <div className="armoryIdentityCopy">
              <span className="armoryPill">{activePresentation.difficultyTag}</span>
              <strong className="armoryIdentityTitle">{activeLoadout.name}</strong>
              <span className="armoryIdentityMeta">{activePresentation.titleLine}</span>
            </div>
          </div>

          <div className="armoryRailSection">
            <div className="armoryRailSectionHeader">
              <span className="armorySectionKicker">Mode Sim</span>
              <strong>{selectedMode.label}</strong>
            </div>
            <div className="armoryModeGrid">
              {modes.map((mode) => (
                <ModeSimButton
                  key={mode.id}
                  mode={mode}
                  isActive={mode.id === selectedMode.id}
                  onClick={() => onModeChange?.(mode.id)}
                />
              ))}
            </div>
          </div>

          <div className="armoryRailSection">
            <div className="armoryRailSectionHeader">
              <span className="armorySectionKicker">Telemetry</span>
              <strong>{activePresentation.glanceText}</strong>
            </div>
            <div className="armoryTelemetryStack">
              {activePresentation.summaryStats.map((stat) => (
                <TelemetryMeter key={`rail-${stat.label}`} label={stat.label} value={stat.value} />
              ))}
            </div>
          </div>

          <div className="armoryRailSection">
            <div className="armoryRailSectionHeader">
              <span className="armorySectionKicker">Quick Slots</span>
              <strong>Pick the build Ready will use</strong>
            </div>
            <div className="armorySlotStack" role="tablist" aria-label="Saved build slots">
              {localSavedLoadouts.map((loadout, index) => (
                <LoadoutRailCard
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
            <Link className="primaryButton" to="/game">
              Back to Game
            </Link>
          </div>
        </aside>

        <div className="armoryStage">
          <section className="armoryHero">
            <div className="armoryHeroCopy">
              <p className="armoryEyebrow">Live Build Readout</p>
              <h2 className="armoryHeroTitle">{activePresentation.titleLine}</h2>
              <p className="armoryHeroText">{activePresentation.bestFor}</p>
            </div>
            <div className="armoryHeroStats">
              <article className="armoryHeroStat">
                <span>Score Delta</span>
                <strong>{activePresentation.scoreDeltaLabel}</strong>
              </article>
              <article className="armoryHeroStat">
                <span>Power Tempo</span>
                <strong>{activePresentation.powerCadence}</strong>
              </article>
              <article className="armoryHeroStat">
                <span>Player Level</span>
                <strong>Lv {playerLevel}</strong>
              </article>
            </div>
          </section>

          <div className="armorySectionGrid">
            <section className="armorySection">
              <div className="armorySectionHeader">
                <div>
                  <p className="armorySectionKicker">Build Slot</p>
                  <h3 className="armorySectionTitle">Name, activate, and reset</h3>
                </div>
                <button
                  type="button"
                  className="secondaryButton armoryResetButton"
                  onClick={handleResetLoadout}
                >
                  Reset This Slot
                </button>
              </div>

              <div className="armorySlotEditor">
                <label className="armoryField" htmlFor="armory-build-name">
                  <span className="armoryFieldLabel">Build Name</span>
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

                <div className="armoryInfoStrip">
                  <span className="armoryInfoChip">Ready uses this slot next round</span>
                  <span className="armoryInfoChip">{selectedMode.label} sim</span>
                  <span className="armoryInfoChip">{activePresentation.difficultyTag}</span>
                </div>
              </div>
            </section>

            <section className="armorySection">
              <div className="armorySectionHeader">
                <div>
                  <p className="armorySectionKicker">Passive Stack</p>
                  <h3 className="armorySectionTitle">Shape the round</h3>
                </div>
              </div>

              <div className="armoryModuleStack">
                {MODULE_SLOTS.map((slot) => (
                  <div key={slot.id} className={`armoryModuleLane tone-${slot.id}`}>
                    <div className="armoryModuleLaneHeader">
                      <span className={`armoryModuleLaneIcon tone-${slot.id}`} aria-hidden="true">
                        <ModuleSlotGlyph slotId={slot.id} />
                      </span>
                      <div>
                        <strong className="armoryModuleLaneTitle">{slot.label}</strong>
                        <p className="armoryModuleLaneLead">{slot.description}</p>
                      </div>
                    </div>

                    <div className="armoryChoiceGrid">
                      {moduleOptionsBySlot[slot.id].map((module) => {
                        const isLocked = playerLevel < module.unlockLevel
                        const copy = getModuleOptionPresentation(module.id)
                        const hint = isLocked
                          ? getUnlockText(module.unlockLevel)
                          : activeLoadout.moduleIds?.[slot.key] === module.id
                            ? "Equipped"
                            : ""

                        return (
                          <BuildChoiceCard
                            key={module.id}
                            tone={`tone-${slot.id}`}
                            icon={<ModuleSlotGlyph slotId={slot.id} />}
                            label={module.label}
                            hint={hint}
                            youGet={copy.youGet}
                            youGiveUp={copy.youGiveUp}
                            bestIn={copy.bestIn}
                            isSelected={activeLoadout.moduleIds?.[slot.key] === module.id}
                            isLocked={isLocked}
                            onClick={() => handleSelectModule(slot.key, module.id)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="armorySection">
              <div className="armorySectionHeader">
                <div>
                  <p className="armorySectionKicker">Hotbar</p>
                  <h3 className="armorySectionTitle">Choose keys 1, 2, and 3</h3>
                </div>
              </div>

              <div className="armoryHotbarStrip" role="tablist" aria-label="Hotbar slot selection">
                {activePresentation.powerSlots.map((powerSlot, index) => (
                  <HotbarSlotButton
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
                  const isTakenElsewhere = activeLoadout.powerupIds.some((equippedId, index) => (
                    index !== editingPowerSlotIndex && equippedId === powerup.id
                  ))
                  const isSelected = selectedPowerupId === powerup.id
                  const isDisabled = isLocked || isTakenElsewhere
                  const copy = getPowerupOptionPresentation(powerup.id)
                  const adjustedAwardEvery = Math.max(
                    1,
                    Math.round(powerup.awardEvery * activePresentation.roundRules.powerupAwardMultiplier)
                  )
                  let hint = `Every ${adjustedAwardEvery} streak`

                  if (isLocked) {
                    hint = getUnlockText(powerup.unlockLevel)
                  } else if (isTakenElsewhere && !isSelected) {
                    hint = "Already on another key"
                  } else if (isSelected) {
                    hint = `On key ${editingPowerSlotIndex + 1}`
                  }

                  return (
                    <BuildChoiceCard
                      key={powerup.id}
                      tone="tone-power"
                      icon={<PowerupGlyph powerupId={powerup.id} />}
                      label={powerup.label}
                      hint={hint}
                      youGet={copy.youGet}
                      youGiveUp={copy.youGiveUp}
                      bestIn={copy.bestIn}
                      isSelected={isSelected}
                      isLocked={isDisabled}
                      onClick={() => handleSelectPowerup(powerup.id)}
                    />
                  )
                })}
              </div>
            </section>

            <section className="armorySection">
              <div className="armorySectionHeader">
                <div>
                  <p className="armorySectionKicker">Live Sim</p>
                  <h3 className="armorySectionTitle">Exactly how this build feels in {selectedMode.label}</h3>
                </div>
              </div>

              <div className="armoryPreviewHud">
                {activePresentation.summaryStats.map((stat) => (
                  <article key={stat.label} className="armoryPreviewCard">
                    <span className="armoryPreviewLabel">{stat.label}</span>
                    <strong className="armoryPreviewValue">{stat.value}</strong>
                  </article>
                ))}
              </div>

              <div className="armoryPreviewBoard">
                <article className="armoryPreviewPanel">
                  <span className="armoryPreviewPanelTitle">You feel</span>
                  <p className="armoryPreviewPanelText">{activePresentation.glanceText}</p>
                </article>
                <article className="armoryPreviewPanel">
                  <span className="armoryPreviewPanelTitle">Strengths</span>
                  <div className="armoryChipRow">
                    {activePresentation.strengths.map((item) => (
                      <span key={item} className="armoryChip">{item}</span>
                    ))}
                  </div>
                </article>
                <article className="armoryPreviewPanel">
                  <span className="armoryPreviewPanelTitle">Tradeoffs</span>
                  <div className="armoryChipRow">
                    {activePresentation.tradeoffs.map((item) => (
                      <span key={item} className="armoryChip armoryChip-risk">{item}</span>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
