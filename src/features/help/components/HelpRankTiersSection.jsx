export default function HelpRankTiersSection({ tiers = [] }) {
  return (
    <section className="helpBlock">
      <h2 className="cardH2">Ranked Tiers</h2>
      <p className="muted">Each rank tier has a target MMR range.</p>
      <div className="rankTierGrid">
        {tiers.map((tier) => (
          <article key={tier.id} className="rankTierCard" data-tier={tier.id} aria-label={`${tier.label} ${tier.mmrRange}`}>
            <p className="rankTierLabel">{tier.label}</p>
            <div className="rankTierEmblemWrap" aria-hidden="true">
              <img className="rankTierEmblem" src={tier.imageSrc} alt="" />
            </div>
            <p className="rankTierRange">{tier.mmrRange}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
