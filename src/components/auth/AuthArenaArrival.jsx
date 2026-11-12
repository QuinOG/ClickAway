import ArenaWorldArt from "../art/ArenaWorldArt.jsx"

export default function AuthArenaArrival({ mode = "login", name = "", children }) {
  const isSignup = mode === "signup"

  return (
    <div className="authArrival">
      <div className="authStadium" aria-hidden="true">
        <ArenaWorldArt className="authStadiumArt" />
        <span className="authStadiumFloor" />
      </div>
      <div className="authTitleScreen" aria-hidden="true">
        <span className="authTitleMark">
          <img src="/brand/clickaway-mark.svg" alt="" width="96" height="96" decoding="async" />
        </span>
        <span className="authWordmark">ClickAway</span>
        <span className="authTagline">Precision arena · Season 1</span>
      </div>
      <section className="authPanel authPass" aria-labelledby="auth-page-title">
        <span className="authPassStub" aria-hidden="true"><b>Competitor pass</b><i>Admit one · Season 1</i></span>
        <span className="authPassSeal" aria-hidden="true">S1</span>
        <div className="authIdentity" aria-label="Competitor pass preview">
          <div className="authCredentialDetail" aria-hidden="true">
            <span className="authCredentialSerial">NO. 001 / 07492</span>
            <span className="authCredentialWatermark">ARENA<br />01</span>
            <span className="authCredentialStamp">ISSUED<br /><b>SEASON 01</b><br />ARENA OFFICE</span>
            <span className="authCredentialFooter">ADMISSION / VALID FOR ONE COMPETITOR</span>
          </div>
          <div className="authPortrait"><img src="/skins/racoon.svg" alt="" /></div>
          <div className="authIdentityCopy"><small>Season 01 / Competitor</small><strong>{name.trim() || (isSignup ? "NEW COMPETITOR" : "RETURNING PLAYER")}</strong><span>OFFICIAL ARENA PASS / ADMIT ONE</span></div>
        </div>
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
