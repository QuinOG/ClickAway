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

export const WALKTHROUGH_STEPS = [
  {
    id: "welcome",
    title: "Builds live here",
    instruction: "Armory changes your active build. Ready just launches whatever is active next round.",
    note: "This walkthrough edits the real slot on your account, and every change saves instantly.",
  },
  {
    id: "slot",
    targetId: "nameplate",
    title: "This is your live build",
    instruction: "Click the nameplate to rename it, or keep the current name and move on.",
    note: "Ready will use this exact build next round.",
  },
  {
    id: "tempo",
    armoryStepId: "passives",
    targetId: "passives",
    moduleSlotId: "tempoCore",
    title: "Tempo Core shapes pace",
    instruction: "Pick the target pace you want, or keep the current option.",
    note: "This lane changes target size, shrink pressure, and score pace.",
  },
  {
    id: "streak",
    armoryStepId: "passives",
    targetId: "passives",
    moduleSlotId: "streakLens",
    title: "Streak Lens changes combo risk",
    instruction: "Choose how fast combo grows and how punishing misses feel.",
    note: "Safer options recover better. Greedier options score harder.",
  },
  {
    id: "rig",
    armoryStepId: "passives",
    targetId: "passives",
    moduleSlotId: "powerRig",
    title: "Power Rig controls charge tempo",
    instruction: "Pick how your round tools arrive, or keep the current rig.",
    note: "Some rigs start charged. Others make later charges faster or slower.",
  },
  {
    id: "hotbar-1",
    armoryStepId: "hotbar",
    targetId: "hotbar",
    powerSlotIndex: 0,
    title: "Key 1 is your first tool",
    instruction: "Choose any unlocked power for key 1.",
    note: "Duplicates are blocked automatically, so each key stays distinct.",
  },
  {
    id: "hotbar-2",
    armoryStepId: "hotbar",
    targetId: "hotbar",
    powerSlotIndex: 1,
    title: "Key 2 is your backup tool",
    instruction: "Pick a second power that complements the first.",
    note: "Think in moments: stabilizer, bailout, or score push.",
  },
  {
    id: "hotbar-3",
    armoryStepId: "hotbar",
    targetId: "hotbar",
    powerSlotIndex: 2,
    title: "Key 3 finishes the loadout",
    instruction: "Choose the last power, or keep the one already equipped.",
    note: "Your hotbar is the live 1 / 2 / 3 tray you will see in-round.",
  },
  {
    id: "review",
    armoryStepId: "review",
    targetId: "review",
    title: "Quick confidence check",
    instruction: "This is the readout for your current mode. Glance at the feel summary, strengths, tradeoffs, and hotbar cadence.",
    note: "If it feels right, head back to Ready. If not, keep tuning here.",
  },
]
