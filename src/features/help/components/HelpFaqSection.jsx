export default function HelpFaqSection({ faqItems, showTitle = true }) {
  return (
    <section className="helpBlock">
      {showTitle ? <h2 className="cardH2">FAQ</h2> : null}
      <div className="faqList">
        {faqItems.map((item) => (
          <div key={item.question} className="faqItem">
            <p className="faqQuestion">{item.question}</p>
            <p className="faqAnswer">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
