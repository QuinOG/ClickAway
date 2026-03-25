export default function ShopCategoryTabs({
  tabs = [],
  activeCategoryId,
  onChange,
}) {
  return (
    <div className="shopTabRail" role="tablist" aria-label="Shop categories">
      {tabs.map((tab) => {
        const isActive = tab.id === activeCategoryId

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            className={`shopTab ${isActive ? "active" : ""}`}
            aria-selected={isActive}
            onClick={() => onChange?.(tab.id)}
          >
            <span className="shopTabSignal" aria-hidden="true" />
            <span className="shopTabCopy">
              <span className="shopTabLabel">{tab.label}</span>
              <span className="shopTabOwned">
                {tab.ownedCount}/{tab.itemCount} owned
              </span>
            </span>
            <span className="shopTabCount">{tab.itemCount}</span>
          </button>
        )
      })}
    </div>
  )
}
