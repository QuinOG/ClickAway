import { useId, useState } from "react"

export default function InfoStrip({
  title = "Most Useful Insights",
  points = [],
  collapsible = false,
  defaultCollapsed = false,
  summary = "",
}) {
  const [isCollapsed, setIsCollapsed] = useState(collapsible ? defaultCollapsed : false)
  const bodyId = useId()
  if (!points.length) return null

  const summaryText = summary || points[0]

  if (!collapsible) {
    return (
      <section className="helpBlock infoStrip">
        <h2 className="cardH2">{title}</h2>
        <ul className="helpList helpInlineList">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className={`helpBlock infoStrip infoStripCollapsible${isCollapsed ? " isCollapsed" : " isExpanded"}`}>
      <button
        type="button"
        className="infoStripToggle"
        onClick={() => setIsCollapsed((currentValue) => !currentValue)}
        aria-expanded={!isCollapsed}
        aria-controls={bodyId}
      >
        <span className="infoStripToggleText">
          <span className="cardH2 infoStripTitle">{title}</span>
          <span className="infoStripSummary">{summaryText}</span>
        </span>
        <span className="infoStripToggleIcon" aria-hidden="true">{isCollapsed ? "Show" : "Hide"}</span>
      </button>

      <div
        id={bodyId}
        className={`infoStripBody${isCollapsed ? " isCollapsed" : " isExpanded"}`}
        aria-hidden={isCollapsed}
      >
        <ul className="helpList helpInlineList">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
