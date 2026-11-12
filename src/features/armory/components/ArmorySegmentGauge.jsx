// Ten lit segments for a 1-10 rating. With `next`, the segments between the
// two ratings light mint (gain) or coral (loss) so a swap reads at a glance.
export default function ArmorySegmentGauge({ rating, next = null, className = "" }) {
  if (rating === null || rating === undefined) return null
  const low = next === null ? rating : Math.min(rating, next)
  const high = next === null ? rating : Math.max(rating, next)
  const deltaClass = next === null || next === rating ? "" : next > rating ? "isGain" : "isLoss"
  return (
    <span className={`armorySegmentGauge ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => {
        const step = index + 1
        const state = step <= low ? "isOn" : step <= high && deltaClass ? deltaClass : ""
        return <i key={step} className={state} />
      })}
    </span>
  )
}
