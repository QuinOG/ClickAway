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
            <h3 className="quickStartCardTitle">{card.title}</h3>
            <p className="quickStartCardBody">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
