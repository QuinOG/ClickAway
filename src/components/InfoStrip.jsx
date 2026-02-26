export default function InfoStrip({ title = "Most Useful Insights", points = [] }) {
  if (!points.length) return null

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
