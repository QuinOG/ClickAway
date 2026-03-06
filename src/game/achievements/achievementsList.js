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
      targetValue: 1,
    },
    {
      id: "hard-rounds-50",
      title: "Endurance Grind",
      description: "Play 50 total rounds.",
      iconKey: "rounds",
      metricKey: "totalRounds",
      targetValue: 1,
    },
    {
      id: "career-rounds-250",
      title: "Routine Runner",
      description: "Play 250 total rounds.",
      iconKey: "rounds",
      metricKey: "totalRounds",
      targetValue: 1,
    },
    {
      id: "career-rounds-1000",
      title: "Clockwork Grinder",
      description: "Play 1,000 total rounds.",
      iconKey: "rounds",
      metricKey: "totalRounds",
      targetValue: 1,
    },
  ],
  level: [
    {
      id: "easy-level-5",
      title: "Arena Regular",
      description: "Reach level 5.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 1,
    },
    {
      id: "hard-level-15",
      title: "Arcade Operator",
      description: "Reach level 15.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 1,
    },
    {
      id: "career-level-30",
      title: "Arena Veteran",
      description: "Reach level 30.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 1,
    },
    {
      id: "career-level-50",
      title: "Legacy Player",
      description: "Reach level 50.",
      iconKey: "level",
      metricKey: "level",
      targetValue: 1,
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
      targetValue: 1,
    },
    {
      id: "hard-ranked-50",
      title: "Rank Specialist",
      description: "Play 50 ranked rounds.",
      iconKey: "ranked",
      metricKey: "rankedRounds",
      targetValue: 1,
    },
    {
      id: "career-ranked-250",
      title: "Rank Devotee",
      description: "Play 250 ranked rounds.",
      iconKey: "ranked",
      metricKey: "rankedRounds",
      targetValue: 1,
    },
    {
      id: "career-ranked-1000",
      title: "Queue Legend",
      description: "Play 1,000 ranked rounds.",
      iconKey: "ranked",
      metricKey: "rankedRounds",
      targetValue: 1,
    },
  ],
  economy: [
    {
      id: "easy-coins-500",
      title: "Coin Collector",
      description: "Earn 500 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 1,
    },
    {
      id: "hard-coins-5000",
      title: "Vault Builder",
      description: "Earn 5,000 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 1,
    },
    {
      id: "career-coins-25000",
      title: "Golden Vault",
      description: "Earn 25,000 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 1,
    },
    {
      id: "career-coins-100000",
      title: "Treasury King",
      description: "Earn 100,000 total coins.",
      iconKey: "economy",
      metricKey: "totalCoinsEarned",
      targetValue: 1,
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
