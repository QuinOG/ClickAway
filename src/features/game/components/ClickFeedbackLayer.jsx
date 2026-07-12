export default function ClickFeedbackLayer({ clickFeedbackItems }) {
  return (
    <div className="clickFeedbackLayer" aria-hidden="true">
      {clickFeedbackItems.map((feedback) => (
        <span
          key={feedback.id}
          className={`clickFeedback ${feedback.type}`}
          style={{ left: `${feedback.x}px`, top: `${feedback.y}px` }}
        >
          <span className="clickFeedbackLocus" />
          <span className="clickFeedbackValue">{feedback.value}</span>
        </span>
      ))}
    </div>
  )
}
