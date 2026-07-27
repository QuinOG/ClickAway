export const ARMORY_STEPS = [
  { id: "passives", label: "Mods", lead: "Pick perks for your build." },
  { id: "hotbar", label: "Powerups", lead: "Choose powerups for keys 1, 2, and 3." },
  { id: "review", label: "Test Run", lead: "Try your build for 10 seconds." },
]

export const ARMORY_STEP_IDS = new Set(ARMORY_STEPS.map((step) => step.id))

export const DEFAULT_ARMORY_STEP_ID = ARMORY_STEPS[0].id

// Old deep links keep landing somewhere sensible: the "slot" step's content now
// lives on the machine and the bay wall, which are always on stage.
export const LEGACY_ARMORY_STEP_ALIASES = {
  slot: DEFAULT_ARMORY_STEP_ID,
}

// Phase 12: 5 steps, down from 9 — one path through the machine instead of
// a step per lane. Each step teaches the pattern once; the other two lanes
// and keys work identically, so nothing here re-explains them.
export const WALKTHROUGH_STEPS = [
  {
    id: "welcome",
    title: "Builds live here",
    instruction: "Armory changes your active build. Ready just launches whatever is active next round.",
    note: "This walkthrough edits the real slot on your account, and every change saves instantly.",
  },
  {
    id: "machine",
    targetId: "machine",
    title: "This is your machine",
    instruction: "Your mods are above the target and your powerups are below it. Click the name to rename this build, or keep it and move on.",
    note: "Ready will launch this exact machine next round.",
  },
  {
    id: "module",
    armoryStepId: "passives",
    targetId: "passives",
    moduleSlotId: "tempoCore",
    title: "Install one part",
    instruction: "Click a mod to equip it instantly.",
    note: "Streak Lens and Power Rig work the same way.",
  },
  {
    id: "rack",
    armoryStepId: "hotbar",
    targetId: "hotbar",
    powerSlotIndex: 0,
    title: "Equip a powerup",
    instruction: "Click a powerup to equip it on key 1. If it is already on another key, the two powerups swap.",
    note: "Keys 2 and 3 work exactly the same way.",
  },
  {
    id: "range",
    armoryStepId: "review",
    targetId: "review",
    title: "Feel it before you trust it",
    instruction: "Run a live 10-second sample with this exact build, then decide.",
    note: "No XP, no coins, no rank — nothing is saved.",
  },
]
