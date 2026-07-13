export default function AuthArenaArrival({ mode = "login", children }) {
  const isSignup = mode === "signup"

  return (
    <div className="authArrival">
      <section className="authPanel" aria-labelledby="auth-page-title">
        <div className="authPanelHeader">
          <span className="authEyebrow">
            {isSignup ? "New competitor" : "Competitor access"}
          </span>
          <h1 className="authTitle" id="auth-page-title">
            {isSignup ? "Make every click count." : "Return to the arena."}
          </h1>
          <p className="authSubtitle">
            {isSignup
              ? "Create your player identity and start your first round in under a minute."
              : "Pick up your build, records, and climb exactly where you left them."}
          </p>
        </div>

        <div className="authMobilePreview" aria-label="Practice, Casual, and Ranked arena modes">
          <span className="authMobileTrack" aria-hidden="true" />
          <span className="authMobileMode" data-mode="practice" aria-hidden="true"><i /></span>
          <span className="authMobileMode" data-mode="casual" aria-hidden="true"><i /></span>
          <span className="authMobileMode" data-mode="ranked" aria-hidden="true"><i /></span>
          <span className="authMobileTarget" aria-hidden="true">
            <img src="/brand/clickaway-mark.svg" alt="" width="96" height="96" decoding="async" />
          </span>
        </div>

        {children}
      </section>

      <aside className="authArenaPreview" aria-labelledby="arena-preview-title">
        <div className="authArenaGrid" aria-hidden="true" />
        <div className="authTargetTrail" aria-hidden="true">
          <span className="authTrailLine" />
          <span className="authDemoTarget authDemoTargetOne" />
          <span className="authDemoTarget authDemoTargetTwo" />
          <span className="authDemoTarget authDemoTargetThree" />
          <span className="authImpactLocus">
            <img src="/brand/clickaway-mark.svg" alt="" width="96" height="96" decoding="async" />
          </span>
        </div>

        <div className="authArenaCopy">
          <span className="authPreviewLabel">Arena preview · demonstration only</span>
          <h2 id="arena-preview-title">Precision becomes momentum.</h2>
          <p>
            Train your aim, build a loadout, then put your streak on the Season Ladder.
          </p>
          <div className="authModeRail" aria-label="Available play modes">
            <span data-mode="practice">Practice</span>
            <span data-mode="casual">Casual</span>
            <span data-mode="ranked">Ranked</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
