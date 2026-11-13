import { useEffect, useRef, useState } from "react"

/*
 * The category rail stays pinned to the top of the page while the catalog
 * scrolls, compacting once it is stuck. Switching category while stuck
 * returns to the top of the catalog so the new section starts in view.
 */
export default function ShopCategoryTabs({
  tabs = [],
  activeCategoryId,
  onChange,
}) {
  const sentinelRef = useRef(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === "undefined") return undefined
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) + 1),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  function handleSelect(tabId, source) {
    onChange?.(tabId, source)
    if (isStuck) sentinelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
  }

  function handleKeyDown(event, index) {
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
        : event.key === "Home" ? 0
          : event.key === "End" ? tabs.length - 1 : null
    if (nextIndex === null) return
    event.preventDefault()
    const nextTab = event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[nextIndex]
    nextTab.focus()
    handleSelect(tabs[nextIndex].id, nextTab)
  }

  return (
    <>
      <span ref={sentinelRef} className="shopTabRailSentinel" aria-hidden="true" />
      <div className={`shopTabRail${isStuck ? " isStuck" : ""}`} role="tablist" aria-label="Shop categories">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeCategoryId

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              className={`shopTab ${isActive ? "active" : ""}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onClick={(event) => handleSelect(tab.id, event.currentTarget)}
            >
              <span className="shopTabSignal" aria-hidden="true" />
              <span className="shopTabCopy">
                <span className="shopTabLabel">{tab.label}</span>
                <span className="shopTabOwned">
                  {tab.ownedCount}/{tab.itemCount} owned
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
