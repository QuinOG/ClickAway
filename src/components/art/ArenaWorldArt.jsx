export default function ArenaWorldArt({ className = "" }) {
  return (
    <svg
      className={`arenaWorldArt ${className}`.trim()}
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="arenaWorldCanopy">
        <path d="M38 164V92Q600 -16 1162 92v72" />
        <path d="M74 164V112Q600 16 1126 112v52" />
        <path d="M38 92h1124M74 112h1052M112 133h976" />
        <path d="m180 164 54-51m112 30 38-45m448 45-38-45m352 66-54-51" />
      </g>
      <g className="arenaWorldSideRig">
        <path d="M0 164h220v76H0m980-76h220v76H980" />
        <path d="M22 164v180m48-180v116m80-116v156m48-156v95M1130 164v95m-48-95v156m-80-156v116m-48-116v180" />
        <path d="M0 240h220m-220 24h220m-220 24h220m980-48h220m-220 24h220m-220 24h220" />
        <path d="m0 344 220-104M0 240l220 104m980-104 220 104m-220-104 220 104" />
      </g>
      <g className="arenaWorldTargetRails">
        <path d="M272 190v38m656-38v38M288 190h64m496 0h64" />
        <path d="M340 178v12m520-12v12M346 178h42m466 0h-42" />
      </g>
      <g className="arenaWorldLamps">
        <path d="M112 133v42m976-42v42" />
        <circle cx="112" cy="132" r="8" />
        <circle cx="1088" cy="132" r="8" />
        <circle cx="300" cy="190" r="5" />
        <circle cx="900" cy="190" r="5" />
      </g>
    </svg>
  )
}
