export const ARMORY_STEPS = [
  { id: "passives", label: "Passive Stack", lead: "Tune the 3 systems that shape the round." },
  { id: "hotbar", label: "Hotbar", lead: "Choose the tools on keys 1, 2, and 3." },
  { id: "review", label: "Test Range", lead: "Feel the build in a live 10-second sample." },
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
    instruction: "The passive stack racks on top, the target sits center, and your hotbar racks below. Click the nameplate to rename it, or keep the current name and move on.",
    note: "Ready will launch this exact machine next round.",
  },
  {
    id: "module",
    armoryStepId: "passives",
    targetId: "passives",
    moduleSlotId: "tempoCore",
    title: "Install one part",
    instruction: "Hover or focus a part to preview its effect on the machine and the instruments, then click to install it.",
    note: "Streak Lens and Power Rig work the same way — preview, then commit.",
  },
  {
    id: "rack",
    armoryStepId: "hotbar",
    targetId: "hotbar",
    powerSlotIndex: 0,
    title: "Rack one tool",
    instruction: "Preview a power on key 1, then click to install it. A tool already racked on another key swaps in one click instead of blocking you.",
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
