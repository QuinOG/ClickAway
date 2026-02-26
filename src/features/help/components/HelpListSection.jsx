export default function HelpListSection({ title, items, ordered = false }) {
  const ListTag = ordered ? "ol" : "ul"

  return (
    <section className="helpBlock">
      <h2 className="cardH2">{title}</h2>
      <ListTag className="helpList">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </section>
  )
}
