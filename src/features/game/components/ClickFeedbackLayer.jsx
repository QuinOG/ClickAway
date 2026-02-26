export default function ClickFeedbackLayer({ clickFeedbackItems }) {
  return (
    <>
      {clickFeedbackItems.map((feedback) => (
        <span
          key={feedback.id}
          className={`clickFeedback ${feedback.type}`}
          style={{ left: `${feedback.x}px`, top: `${feedback.y}px` }}
        >
          {feedback.value}
        </span>
      ))}
    </>
  )
}
