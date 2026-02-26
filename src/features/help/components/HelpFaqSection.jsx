export default function HelpFaqSection({ faqItems }) {
  return (
    <section className="helpBlock">
      <h2 className="cardH2">FAQ</h2>
      <ul className="helpList">
        {faqItems.map((item) => (
          <li key={item.question}>
            <strong>{item.question}</strong> {item.answer}
          </li>
        ))}
      </ul>
    </section>
  )
}
