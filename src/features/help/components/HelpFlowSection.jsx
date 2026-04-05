export default function HelpFlowSection({ title, steps = [] }) {
  return (
    <section className="helpBlock" aria-label={title}>
      <p className="helpSectionEyebrow">Round Loop</p>
      <h2 className="cardH2">{title}</h2>
      <ol className="helpFlowList">
        {steps.map((step, index) => (
          <li key={step.title} className="helpFlowStep">
            <div className="helpFlowIndex" aria-hidden="true">
              {index + 1}
            </div>
            <div className="helpFlowCopy">
              <h3 className="helpFlowTitle">{step.title}</h3>
              <p className="helpFlowBody">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
