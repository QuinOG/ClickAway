function getMetricNumber(stats = {}, metricKey = "") {
  const rawValue = stats?.[metricKey]
  const numericValue = Number(rawValue)
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : null
}

export const ACHIEVEMENT_CATEGORIES = [
  { key: "rounds", label: "Rounds", isCoreCategory: true },
  { key: "level", label: "Level", isCoreCategory: true },
  { key: "ranked", label: "Ranked", isCoreCategory: true },
  { key: "economy", label: "Economy", isCoreCategory: true },
  { key: "streak", label: "Streak", isCoreCategory: true },
  { key: "master", label: "Master", isCoreCategory: false },
]

export const DEFAULT_ACHIEVEMENT_CATEGORY_KEY = "rounds"

export const CORE_ACHIEVEMENT_CATEGORY_KEYS = ACHIEVEMENT_CATEGORIES
  .filter((category) => category.isCoreCategory)
  .map((category) => category.key)

export const ACHIEVEMENT_CATEGORY_LABELS = ACHIEVEMENT_CATEGORIES.reduce(
  (labelsByKey, category) => ({
    ...labelsByKey,
    [category.key]: category.label,
  }),
  {}
)

function getCategoryLabel(categoryKey = "") {
  return ACHIEVEMENT_CATEGORY_LABELS[categoryKey] ?? "General"
}

function createMetricAchievement({
  id,
  title,
  description,
  iconKey,
  metricKey,
  targetValue,
  categoryKey,
}) {
  const categoryLabel = getCategoryLabel(categoryKey)

  return {
    id,
    title,
    description,
    iconKey,
    metricKey,
    targetValue,
    categoryKey,
    categoryLabel,
    type: "metric",
    computeCurrent: (stats) => getMetricNumber(stats, metricKey),
  }
}

function createCategoryMasterAchievement(coreCategoryKey = "") {
  const coreCategoryLabel = getCategoryLabel(coreCategoryKey)

  return {
    id: `master-${coreCategoryKey}`,
    title: `${coreCategoryLabel} Master`,
    description: `Unlock all ${coreCategoryLabel} achievements.`,
    iconKey: "master",
    categoryKey: "master",
    categoryLabel: getCategoryLabel("master"),
    type: "categoryMaster",
    isCategoryMaster: true,
    masterCategoryKey: coreCategoryKey,
    masterCategoryLabel: coreCategoryLabel,
  }
}

function createMasterOfMastersAchievement() {
  return {
    id: "master-of-masters",
    title: "Master of Masters",
    description: "Unlock all category master achievements.",
    iconKey: "master",
    categoryKey: "master",
    categoryLabel: getCategoryLabel("master"),
    type: "masterOfMasters",
    isMasterOfMasters: true,
  }
}

function buildCoreCategoryAchievements(categoryKey = "", metricAchievements = []) {
  return metricAchievements.map((achievement) =>
    createMetricAchievement({
      ...achievement,
      categoryKey,
    })
  )
}

const CORE_CATEGORY_ACHIEVEMENT_DEFINITIONS = {
  rounds: [
    {
      id: "easy-rounds-1",
      title: "First Click",
      description: "Play 1 total round.",
      iconKey: "rounds",
      metricKey: "totalRounds",
      targetValue: 1,
    },
    {
      id: "easy-rounds-10",
      title: "Session Builder",
      description: "Play 10 total rounds.",
      iconKey: "rounds",
      metricKey: "totalRounds",
      targetValue: 10,
    },
    {
      id: "hard-rounds-50",
      title: "Endurance Grind",
      description: "Play 50 total rounds.",
      iconKey: "rounds",
      metricKey: "totalRounds",
      targetValue: 50,
    },
    {
      id: "career-rounds-100",
      title: "Hundred Club",
      description: "Play 100 total rounds.",
      iconKey: "rounds",
      metricKey: "totalRounds",
      targetValue: 100,
    },
    {
      id: "career-rounds-250",
      title: "Routine Runner",
      description: "Play 250 total rounds.",
      iconKey: "rounds",
      metricKey: "totalRounds",
      targetValue: 250,
    },
  ],
  level: [
    {
      id: "easy-level-5",
      title: "Arena Regular",
      description: "Reach level 5.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 5,
    },
    {
      id: "hard-level-15",
      title: "Arcade Operator",
      description: "Reach level 15.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 15,
    },
    {
      id: "career-level-50",
      title: "Legacy Player",
      description: "Reach level 50.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 50,
    },
    {
      id: "career-level-100",
      title: "Century Climber",
      description: "Reach level 100.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 100,
    },
    {
      id: "career-level-250",
      title: "Ascended Veteran",
      description: "Reach level 250.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 250,
    },
  ],
  ranked: [
    {
      id: "easy-ranked-1",
      title: "Placement Ready",
      description: "Play 1 ranked round.",
      iconKey: "ranked",
      metricKey: "rankedRounds",
      targetValue: 1,
    },
    {
      id: "hard-ranked-10",
      title: "Rank Ladder",
      description: "Play 10 ranked rounds.",
      iconKey: "ranked",
      metricKey: "rankedRounds",
      targetValue: 10,
    },
    {
      id: "hard-ranked-50",
      title: "Rank Specialist",
      description: "Play 50 ranked rounds.",
      iconKey: "ranked",
      metricKey: "rankedRounds",
      targetValue: 50,
    },
    {
      id: "career-ranked-100",
      title: "Queue Regular",
      description: "Play 100 ranked rounds.",
      iconKey: "ranked",
      metricKey: "rankedRounds",
      targetValue: 100,
    },
    {
      id: "career-ranked-250",
      title: "Rank Devotee",
      description: "Play 250 ranked rounds.",
      iconKey: "ranked",
      metricKey: "rankedRounds",
      targetValue: 250,
    },
  ],
  economy: [
    {
      id: "easy-coins-500",
      title: "Coin Collector",
      description: "Earn 500 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 500,
    },
    {
      id: "hard-coins-2000",
      title: "Stack Starter",
      description: "Earn 2,000 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 2000,
    },
    {
      id: "hard-coins-5000",
      title: "Vault Builder",
      description: "Earn 5,000 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 5000,
    },
    {
      id: "career-coins-25000",
      title: "Golden Vault",
      description: "Earn 25,000 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 25000,
    },
    {
      id: "career-coins-50000",
      title: "Treasury Keeper",
      description: "Earn 50,000 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 50000,
    },
  ],
  streak: [
    {
      id: "easy-streak-20",
      title: "Combo Starter",
      description: "Reach a highest streak of 20.",
      iconKey: "streak",
      metricKey: "bestStreak",
      targetValue: 20,
    },
    {
      id: "hard-streak-30",
      title: "Hot Hand",
      description: "Reach a highest streak of 30.",
      iconKey: "streak",
      metricKey: "bestStreak",
      targetValue: 30,
    },
    {
      id: "hard-streak-40",
      title: "Momentum Engine",
      description: "Reach a highest streak of 40.",
      iconKey: "streak",
      metricKey: "bestStreak",
      targetValue: 40,
    },
    {
      id: "career-streak-45",
      title: "Chain Keeper",
      description: "Reach a highest streak of 45.",
      iconKey: "streak",
      metricKey: "bestStreak",
      targetValue: 45,
    },
    {
      id: "career-streak-50",
      title: "Combo Crown",
      description: "Reach a highest streak of 50.",
      iconKey: "streak",
      metricKey: "bestStreak",
      targetValue: 50,
    },
  ],
}

const CORE_ACHIEVEMENTS = CORE_ACHIEVEMENT_CATEGORY_KEYS.flatMap((categoryKey) =>
  buildCoreCategoryAchievements(
    categoryKey,
    CORE_CATEGORY_ACHIEVEMENT_DEFINITIONS[categoryKey] ?? []
  )
)

const CATEGORY_MASTER_ACHIEVEMENTS = CORE_ACHIEVEMENT_CATEGORY_KEYS.map((categoryKey) =>
  createCategoryMasterAchievement(categoryKey)
)

export const ACHIEVEMENTS = [
  ...CORE_ACHIEVEMENTS,
  ...CATEGORY_MASTER_ACHIEVEMENTS,
  createMasterOfMastersAchievement(),
]
