export default function ArmoryWalkthroughOverlay({
  step = null,
  stepIndex = 0,
  stepCount = 0,
  spotlightRect = null,
  selectedModeLabel = "",
  isManual = false,
  onSkip,
  onBack,
  onNext,
  onKeepCurrentName,
  onSaveName,
  onGoToReady,
  onKeepTuning,
}) {
  if (!step) return null

  const dismissLabel = isManual ? "Close" : "Skip"
  const note = step.id === "review" && selectedModeLabel
    ? `${step.note} This preview is using ${selectedModeLabel}.`
    : step.note

  return (
    <div className="armoryWalkthroughOverlay" role="dialog" aria-modal="true" aria-labelledby="armory-walkthrough-title">
      {spotlightRect ? (
        <>
          <div className="armoryWalkthroughBlocker" style={{ inset: `0 0 calc(100% - ${spotlightRect.top}px) 0` }} />
          <div className="armoryWalkthroughBlocker" style={{ left: 0, top: spotlightRect.top, width: spotlightRect.left, height: spotlightRect.height }} />
          <div className="armoryWalkthroughBlocker" style={{ left: spotlightRect.right, top: spotlightRect.top, right: 0, height: spotlightRect.height }} />
          <div className="armoryWalkthroughBlocker" style={{ inset: `${spotlightRect.bottom}px 0 0 0` }} />
          <div
            className="armoryWalkthroughSpotlight"
            style={{ left: spotlightRect.left, top: spotlightRect.top, width: spotlightRect.width, height: spotlightRect.height }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="armoryWalkthroughBlocker armoryWalkthroughBlockerFull" />
      )}

      <section className={`armoryWalkthroughPanel ${spotlightRect ? "" : "isCentered"}`}>
        <div className="armoryWalkthroughPanelHeader">
          <p className="armoryWalkthroughEyebrow">Walkthrough {stepIndex + 1} / {stepCount}</p>
          <button type="button" className="armoryWalkthroughDismiss" onClick={onSkip}>
            {dismissLabel}
          </button>
        </div>

        <div className="armoryWalkthroughCopy">
          <h2 id="armory-walkthrough-title" className="armoryWalkthroughTitle">{step.title}</h2>
          <p className="armoryWalkthroughLead">{step.instruction}</p>
          {note ? <p className="armoryWalkthroughNote">{note}</p> : null}
        </div>

        <div className="armoryWalkthroughActions">
          {step.id === "welcome" ? <button type="button" className="primaryButton" onClick={onNext}>Start Walkthrough</button> : null}
          {step.id === "slot" ? (
            <>
              <button type="button" className="secondaryButton" onClick={onKeepCurrentName}>Keep Current Name</button>
              <button type="button" className="primaryButton" onClick={onSaveName}>Save Name</button>
            </>
          ) : null}
          {(step.id.startsWith("hotbar") || step.id === "tempo" || step.id === "streak" || step.id === "rig") ? (
            <>
              <button type="button" className="secondaryButton" onClick={onBack}>Back</button>
              <button type="button" className="primaryButton" onClick={onNext}>Continue</button>
            </>
          ) : null}
          {step.id === "review" ? (
            <>
              <button type="button" className="secondaryButton" onClick={onBack}>Back</button>
              <button type="button" className="secondaryButton" onClick={onKeepTuning}>Keep Tuning</button>
              <button type="button" className="primaryButton" onClick={onGoToReady}>Go to Ready</button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}
