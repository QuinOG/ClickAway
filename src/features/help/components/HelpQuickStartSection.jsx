// A tiny game-style picture per step, so the quick start teaches by sight.
function QuickStartVisual({ step }) {
  if (step === "1") {
    return (
      <span className="quickStartVisual isModes" aria-hidden="true">
        <i className="isPractice">Practice</i><i className="isCasual">Casual</i><i className="isRanked">Ranked</i>
      </span>
    )
  }
  if (step === "2") {
    return (
      <span className="quickStartVisual isCountdown" aria-hidden="true">
        <b>3</b><em /><em /><em />
      </span>
    )
  }
  if (step === "3") {
    return (
      <span className="quickStartVisual isStreak" aria-hidden="true">
        <span className="quickStartTarget" />
        <span className="quickStartStreak"><i className="isOn" /><i className="isOn" /><i className="isOn" /><i /><i /><small>x2</small></span>
      </span>
    )
  }
  return (
    <span className="quickStartVisual isKeys" aria-hidden="true">
      <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>
    </span>
  )
}

export default function HelpQuickStartSection({ cards = [] }) {
  return (
    <section className="helpBlock quickStartFeature" aria-label="Quick Start">
      <header className="quickStartHeader">
        <p className="helpSectionEyebrow">First Minute</p>
        <h2 className="cardH2 quickStartTitle">Quick Start</h2>
        <p className="quickStartLead">
          Four things to know before your first run.
        </p>
      </header>
      <div className="quickStartSummaryGrid">
        {cards.map((card) => (
          <article key={card.title} className="quickStartCard">
            <p className="quickStartCardEyebrow">{card.eyebrow}</p>
            <QuickStartVisual step={card.eyebrow} />
            <h3 className="quickStartCardTitle">{card.title}</h3>
            <p className="quickStartCardBody">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
