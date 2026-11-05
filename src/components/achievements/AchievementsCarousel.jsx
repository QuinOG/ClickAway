import { useEffect, useMemo, useState } from "react"

import AchievementTile from "./AchievementTile.jsx"

const MOBILE_MAX_WIDTH = 700
const TABLET_MAX_WIDTH = 1024

function getItemsPerPage(viewportWidth) {
  if (viewportWidth <= MOBILE_MAX_WIDTH) return 2
  if (viewportWidth <= TABLET_MAX_WIDTH) return 3
  return 5
}

function getInitialItemsPerPage() {
  if (typeof window === "undefined") return 5
  return getItemsPerPage(window.innerWidth)
}

export default function AchievementsCarousel({ achievements = [] }) {
  const [itemsPerPage, setItemsPerPage] = useState(getInitialItemsPerPage)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    function handleResize() {
      setItemsPerPage(getItemsPerPage(window.innerWidth))
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const totalPages = Math.max(1, Math.ceil(achievements.length / itemsPerPage))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const startIndex = safePageIndex * itemsPerPage
  const pageAchievements = useMemo(
    () => achievements.slice(startIndex, startIndex + itemsPerPage),
    [achievements, itemsPerPage, startIndex]
  )

  const paddedAchievements = useMemo(() => {
    const placeholdersNeeded = Math.max(0, itemsPerPage - pageAchievements.length)
    if (placeholdersNeeded === 0) return pageAchievements
    return [
      ...pageAchievements,
      ...Array.from({ length: placeholdersNeeded }, () => null),
    ]
  }, [itemsPerPage, pageAchievements])

  const isPaged = totalPages > 1
  const canGoPrevious = safePageIndex > 0
  const canGoNext = safePageIndex < totalPages - 1

  function goPreviousPage() {
    if (!canGoPrevious) return
    setPageIndex((currentPageIndex) =>
      Math.max(0, Math.min(currentPageIndex, totalPages - 1) - 1)
    )
  }

  function goNextPage() {
    if (!canGoNext) return
    setPageIndex((currentPageIndex) =>
      Math.min(totalPages - 1, Math.min(currentPageIndex, totalPages - 1) + 1)
    )
  }

  if (achievements.length === 0) {
    return (
      <p className="achievementsEmptyState">
        No achievements found.
      </p>
    )
  }

  return (
    <div className={`achievementsCarousel${isPaged ? " isPaged" : " isSinglePage"}`}>
      <div className="achievementsCarouselRowWrap">
        {isPaged ? (
          <button
            type="button"
            className="achievementsArrow"
            onClick={goPreviousPage}
            disabled={!canGoPrevious}
            aria-label="View previous achievement page"
          >
            &lt;
          </button>
        ) : null}

        <div className="achievementsViewport">
          <div
            className="achievementsRow"
            key={`${safePageIndex}-${itemsPerPage}`}
            style={{ "--achievements-columns": itemsPerPage }}
          >
            {paddedAchievements.map((achievement, index) => (
              <AchievementTile
                key={achievement?.id ?? `placeholder-${safePageIndex}-${index}`}
                achievement={achievement}
                tierIndex={startIndex + index}
                tierCount={achievements.length}
              />
            ))}
          </div>
        </div>

        {isPaged ? (
          <button
            type="button"
            className="achievementsArrow"
            onClick={goNextPage}
            disabled={!canGoNext}
            aria-label="View next achievement page"
          >
            &gt;
          </button>
        ) : null}
      </div>

      {isPaged ? (
        <div className="achievementsFooter">
          <p className="achievementsPageLabel">
            Page {safePageIndex + 1} / {totalPages}
          </p>
          <div className="achievementsDots" aria-hidden="true">
            {Array.from({ length: totalPages }, (_, dotIndex) => (
              <span
                key={`achievements-dot-${dotIndex}`}
                className={`achievementsDot ${dotIndex === safePageIndex ? "isActive" : ""}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
