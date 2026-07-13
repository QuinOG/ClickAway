import {
  ClockCounterClockwise,
  Crosshair,
  GameController,
  Question,
  ShoppingBag,
  Sword,
  Trophy,
  UserCircle,
} from "@phosphor-icons/react"

function RouteGlyph({ routeId, weight = "duotone" }) {
  switch (routeId) {
    case "play": return <GameController weight={weight} />
    case "armory": return <Crosshair weight={weight} />
    case "shop": return <ShoppingBag weight={weight} />
    case "profile": return <UserCircle weight={weight} />
    case "ladder": return <Trophy weight={weight} />
    case "duels": return <Sword weight={weight} />
    case "history": return <ClockCounterClockwise weight={weight} />
    case "help": return <Question weight={weight} />
    default: return <Crosshair weight={weight} />
  }
}

export function RouteSceneBackdrop({ route, isLiveRound = false }) {
  if (!route || isLiveRound) return null

  return (
    <div
      className={`routeSceneBackdrop scene-${route.scene?.tone ?? route.id}`}
      aria-hidden="true"
    >
      <span className="routeSceneGrid" />
      <span className="routeSceneSweep" />
      <span className="routeSceneOrbit routeSceneOrbitOuter" />
      <span className="routeSceneOrbit routeSceneOrbitInner" />
      <span className="routeSceneGlyph"><RouteGlyph routeId={route.id} /></span>
      <span className="routeSceneTrajectory">
        <i />
        <i />
        <i />
      </span>
    </div>
  )
}

export function RouteFallback({ route }) {
  const label = route?.scene?.loadingLabel ?? `Calibrating ${route?.label ?? "arena"}`

  return (
    <div
      className={`routeFallback scene-${route?.scene?.tone ?? route?.id ?? "utility"}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="routeFallbackCore" aria-hidden="true">
        <span className="routeFallbackReticle">
          <RouteGlyph routeId={route?.id} />
        </span>
        <span className="routeFallbackScan" />
      </div>
      <div className="routeFallbackCopy">
        <span className="routeFallbackEyebrow">Arena uplink</span>
        <strong className="routeFallbackText">{label}</strong>
        <span className="routeFallbackProgress" aria-hidden="true"><i /></span>
      </div>
      <div className="routeFallbackSkeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export function CommandHeader({
  routeId,
  eyebrow,
  title,
  subtitle,
  status,
  actions,
  className = "",
}) {
  return (
    <header className={`commandHeader ${className}`.trim()}>
      <div className="commandHeaderGlyph" aria-hidden="true">
        <span><RouteGlyph routeId={routeId} /></span>
      </div>
      <div className="commandHeaderCopy">
        {eyebrow ? <p className="commandHeaderEyebrow">{eyebrow}</p> : null}
        <h1 className="commandHeaderTitle">{title}</h1>
        {subtitle ? <p className="commandHeaderSubtitle">{subtitle}</p> : null}
      </div>
      {status ? <div className="commandHeaderStatus">{status}</div> : null}
      {actions ? <div className="commandHeaderActions">{actions}</div> : null}
    </header>
  )
}
