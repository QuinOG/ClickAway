export const ARMORY_STEPS = [
  { id: "slot", label: "Build Slot", lead: "Name it, make it active, or reset it." },
  { id: "passives", label: "Passive Stack", lead: "Tune the 3 systems that shape the round." },
  { id: "hotbar", label: "Hotbar", lead: "Choose the tools on keys 1, 2, and 3." },
  { id: "review", label: "Review Sim", lead: "See how the build feels in the current mode." },
]

export const ARMORY_STEP_IDS = new Set(ARMORY_STEPS.map((s) => s.id))
