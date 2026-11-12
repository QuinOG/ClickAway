/*
 * ClickAway illustrated icon set.
 *
 * Chunky, filled, outlined pictograms in one art direction: a dark ink
 * outline, layered shading, and a top-left highlight. They are drawn on a 48px
 * grid so they stay crisp from 20px (HUD) to 96px (scene emblems).
 */

const INK = "#0a1322"

function Svg({ size = 32, className = "", title, children, viewBox = "0 0 48 48" }) {
  return (
    <svg
      className={`gameIcon ${className}`.trim()}
      width={size}
      height={size}
      viewBox={viewBox}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <g stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  )
}

export function CoinIcon(props) {
  return (
    <Svg {...props}>
      <ellipse cx="24" cy="27" rx="17" ry="16" fill="#b9761c" />
      <ellipse cx="24" cy="24" rx="17" ry="16" fill="#ffc94a" />
      <ellipse cx="24" cy="24" rx="11.5" ry="10.5" fill="#f5a524" strokeWidth="2" />
      <path d="M24 16.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2L24 28.4l-4.6 2.4.9-5.2-3.8-3.6 5.2-.7Z" fill="#fff1b8" strokeWidth="1.8" />
      <path d="M12 17c2-4 6.5-6.5 11-6.6" fill="none" stroke="#fff6d6" strokeWidth="2.2" />
      <path d="M9 29c2 8 8 12 15 12 8 0 14-4 16-12-3 6-9 9-16 9-6 0-12-3-15-9Z" fill="#754518" stroke="none" opacity=".55" /><path d="M15 33c3 3 6 4 9 4" fill="none" stroke="#fff1b8" strokeWidth="1.4" />
    </Svg>
  )
}

export function GemIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 5 39 18 24 43 9 18Z" fill="#2fb6ff" />
      <path d="M9 18h30L24 43Z" fill="#1585d6" />
      <path d="M17 18 24 5l7 13-7 25Z" fill="#7fe0ff" strokeWidth="1.8" />
      <path d="M14 15.5 21 9.5" fill="none" stroke="#e8fbff" strokeWidth="2.2" />
      <path d="M31 18h8L24 43Z" fill="#075697" stroke="none" opacity=".55" /><path d="m24 7 5 10M12 18h4" fill="none" stroke="#e8fbff" strokeWidth="1.4" />
    </Svg>
  )
}

export function CrestIcon({ tone = "gold", ...props }) {
  const fills = {
    gold: ["#ffcf55", "#c98a1c", "#fff0b0"],
    silver: ["#dfe7f1", "#8d9db3", "#ffffff"],
    bronze: ["#e59a62", "#9a5a2c", "#ffd7b5"],
    platinum: ["#7ff0e2", "#2a9d93", "#dcfffa"],
    diamond: ["#9cc0ff", "#4a6fd1", "#e6efff"],
    unranked: ["#9aa8bb", "#5b6779", "#d6dee9"],
  }[tone] ?? ["#ffcf55", "#c98a1c", "#fff0b0"]

  return (
    <Svg {...props}>
      <path d="M24 4 40 10v13c0 10-7 17-16 21C15 40 8 33 8 23V10Z" fill={fills[1]} />
      <path d="M24 7.5 37 12.5v10.5c0 8-5.6 13.8-13 17.2-7.4-3.4-13-9.2-13-17.2V12.5Z" fill={fills[0]} strokeWidth="2" />
      <path d="M24 14.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L24 27.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" fill={fills[2]} strokeWidth="1.8" />
      <path d="M14 13.5 22 10.5" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2" />
      <path d="M34 14v9c0 6-4 11-10 14" fill="none" stroke={INK} strokeOpacity=".3" strokeWidth="1.8" /><path d="M14 17v5M17 13l3-1" fill="none" stroke={fills[2]} strokeWidth="1.4" />
    </Svg>
  )
}

export function TargetIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="25.5" r="18" fill="#7a1d2c" />
      <circle cx="24" cy="23" r="18" fill="#ff4d5e" />
      <circle cx="24" cy="23" r="12.5" fill="#fff4f0" strokeWidth="2" />
      <circle cx="24" cy="23" r="7" fill="#ff4d5e" strokeWidth="2" />
      <circle cx="24" cy="23" r="2.6" fill="#fff4f0" strokeWidth="1.6" />
      <path d="M11 15c2.5-4 6.5-6.5 11-7" fill="none" stroke="#ffd0d4" strokeWidth="2.2" />
      <path d="M9 27c2 8 8 13 15 13 7 0 13-5 15-13-3 6-8 10-15 10S12 33 9 27Z" fill="#8d1d30" stroke="none" opacity=".45" /><path d="M14 16c2-3 5-4 8-5" fill="none" stroke="#fff4f0" strokeWidth="1.4" />
    </Svg>
  )
}

export function ArmoryIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 34h32l-3 8H11Z" fill="#4a5a72" />
      <path d="M12 26h24a2 2 0 0 1 2 2v6H10v-6a2 2 0 0 1 2-2Z" fill="#8fa3bd" />
      <path d="M17 26v-4h14v4" fill="#6c7f99" />
      <path d="m27.5 6.5 9 9-4 4-9-9Z" fill="#c5d3e4" />
      <path d="M26 12 13 25l3 3 13-13" fill="#a35a2a" />
      <circle cx="35" cy="31" r="2" fill="#5ee8ff" strokeWidth="1.6" />
      <path d="M13 29.5h14" fill="none" stroke="#dbe6f3" strokeWidth="2" />
      <path d="M13 37h22l-1 3H14Z" fill="#26354a" stroke="none" /><path d="m27 9 6 6M13 32h14" fill="none" stroke="#f0f8ff" strokeWidth="1.4" /><circle cx="14" cy="38" r=".8" fill="#dbe6f3" stroke="none" /><circle cx="34" cy="38" r=".8" fill="#dbe6f3" stroke="none" />
    </Svg>
  )
}

export function ShopIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7 19h34v21a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3Z" fill="#8a4d22" />
      <path d="M5 13h38v8H5Z" fill="#b7672e" />
      <path d="M20 13h8v30h-8Z" fill="#ffc94a" />
      <path d="M5 21h38" fill="none" />
      <path d="M17 13c-3-6 2-9 7-2 5-7 10-4 7 2" fill="#ffd96b" />
      <path d="M9 16.5h8" fill="none" stroke="#e7a36b" strokeWidth="2" />
      <path d="M32 23h7v17h-7Z" fill="#5c301b" stroke="none" opacity=".45" /><path d="M10 25v12M23 17v22M26 17v22" fill="none" stroke="#ffdf8a" strokeOpacity=".65" strokeWidth="1.4" /><path d="M11 40h6" fill="none" stroke="#512a18" strokeWidth="1.4" />
    </Svg>
  )
}

export function TrophyIcon(props) {
  return (
    <Svg {...props}>
      <path d="M15 37h18l2 6H13Z" fill="#8a5a14" />
      <path d="M20 29h8l1 8h-10Z" fill="#c98a1c" />
      <path d="M13 6h22v9c0 8-5 14-11 14S13 23 13 15Z" fill="#ffc94a" />
      <path d="M13 9H7c0 7 3 10 7 11M35 9h6c0 7-3 10-7 11" fill="none" />
      <path d="M17 10v6c0 3 1.5 6 4 7.5" fill="none" stroke="#fff1b8" strokeWidth="2.2" />
      <path d="M29 9h4v7c0 5-3 9-7 11 2-4 3-9 3-18Z" fill="#b67416" stroke="none" /><path d="M17 40h14M16 9h7" fill="none" stroke="#fff1b8" strokeWidth="1.4" />
    </Svg>
  )
}

export function SwordsIcon(props) {
  return (
    <Svg {...props}>
      <path d="m8 6 21 21-3 3L5 9V6Z" fill="#dbe6f3" />
      <path d="m40 6-21 21 3 3L43 9V6Z" fill="#b8c7da" />
      <path d="m13 31 4 4M35 31l-4 4" fill="none" strokeWidth="4.5" stroke={INK} />
      <path d="m13 31 4 4M35 31l-4 4" fill="none" strokeWidth="2.2" stroke="#ffc94a" />
      <path d="m9 39 6-6 3 3-6 6ZM39 39l-6-6-3 3 6 6Z" fill="#a35a2a" />
      <path d="M9 9.5 21 21.5" fill="none" stroke="#ffffff" strokeWidth="1.8" />
      <path d="m31 16 7-7M12 14l8 8" fill="none" stroke="#7289a5" strokeWidth="1.4" /><path d="m34 36 3 3M11 39l3-3" fill="none" stroke="#e9b57e" strokeWidth="1.4" />
    </Svg>
  )
}

export function HelmetIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 26C8 15 15 7 24 7s16 8 16 19v8l-5 6H13l-5-6Z" fill="#5d7391" />
      <path d="M12 23h24v8a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z" fill="#11203a" />
      <path d="M15 26h18" fill="none" stroke="#5ee8ff" strokeWidth="3" />
      <path d="M14 15c2.5-3.5 6-5 10-5" fill="none" stroke="#c2d2e6" strokeWidth="2.2" />
      <path d="M34 14c3 4 4 8 4 12v7l-4 5h-5l5-6Z" fill="#344862" stroke="none" /><path d="M16 36h16M15 20c1-4 3-6 6-7" fill="none" stroke="#c2d2e6" strokeWidth="1.4" /><circle cx="15" cy="37" r=".8" fill="#e6f4ff" stroke="none" />
    </Svg>
  )
}

export function ScrollIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 8h22v30a4 4 0 0 1-4 4H12Z" fill="#f1dfb6" />
      <path d="M12 8a4 4 0 0 0-4 4v4h8v-4a4 4 0 0 0-4-4ZM30 42a4 4 0 0 0 4-4v-4h6v4a4 4 0 0 1-4 4Z" fill="#c9a66b" />
      <path d="M17 16h12M17 22h12M17 28h8" fill="none" stroke="#8a6a3a" strokeWidth="2.2" />
      <path d="M30 11h2v21h-2Z" fill="#b9955d" stroke="none" opacity=".55" /><path d="M18 12h10M17 33h6" fill="none" stroke="#fff7dd" strokeWidth="1.4" /><path d="M10 12h4M35 38h3" fill="none" stroke="#805e38" strokeWidth="1.4" />
    </Svg>
  )
}

export function HelpIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="25" r="17" fill="#2f6fd1" />
      <circle cx="24" cy="23" r="17" fill="#4f9bff" />
      <path d="M18.5 18.5c0-3.5 2.5-5.5 5.7-5.5 3.3 0 5.6 2.1 5.6 5 0 4.2-5.6 4.4-5.6 8.5" fill="none" stroke="#ffffff" strokeWidth="3.4" />
      <circle cx="24.2" cy="32" r="2.3" fill="#ffffff" stroke="none" />
      <path d="M9 27c2 8 8 12 15 12s13-4 15-12c-3 6-8 9-15 9S12 33 9 27Z" fill="#194c9c" stroke="none" opacity=".55" /><path d="M13 16c2-4 5-6 9-6" fill="none" stroke="#d9efff" strokeWidth="1.6" />
    </Svg>
  )
}

export function GearIcon(props) {
  return (
    <Svg {...props}>
      <path d="M21 5h6l1 5 4 2 4.5-3 4 4-3 4.5 2 4 5 1v6l-5 1-2 4 3 4.5-4 4-4.5-3-4 2-1 5h-6l-1-5-4-2-4.5 3-4-4 3-4.5-2-4-5-1v-6l5-1 2-4-3-4.5 4-4 4.5 3 4-2Z" fill="#8fa3bd" />
      <circle cx="24" cy="24" r="7" fill="#2a3850" />
      <path d="M13 34c3 3 7 5 11 5 7 0 12-4 15-10-1 8-7 13-15 13-5 0-9-3-11-8Z" fill="#526780" stroke="none" /><path d="M15 16c2-3 5-4 8-4M20 19c2-2 5-2 7-1" fill="none" stroke="#e5effa" strokeWidth="1.4" /><circle cx="24" cy="24" r="3.5" fill="#17263c" stroke="#b7c9dc" strokeWidth="1.3" />
    </Svg>
  )
}

export function DummyIcon(props) {
  return (
    <Svg {...props}>
      <path d="M22 30h4v12h-4Z" fill="#8a5a2c" />
      <path d="M14 43h20" fill="none" strokeWidth="3.4" />
      <circle cx="24" cy="18" r="13" fill="#3ccf9e" />
      <circle cx="24" cy="18" r="8" fill="#e9fff6" strokeWidth="2" />
      <circle cx="24" cy="18" r="3.2" fill="#3ccf9e" strokeWidth="1.8" />
      <path d="M15 11c2-2.5 4.5-3.6 7.5-3.8" fill="none" stroke="#c8fbe6" strokeWidth="2" />
      <path d="M13 21c1 6 5 9 11 9s10-3 11-9c-2 4-6 6-11 6s-9-2-11-6Z" fill="#16856d" stroke="none" opacity=".5" /><path d="M23 33v7" fill="none" stroke="#d6a56b" strokeWidth="1.4" />
    </Svg>
  )
}

export function BoltIcon(props) {
  return (
    <Svg {...props}>
      <path d="M28 4 10 27h12l-4 17 20-25H26Z" fill="#45d4ff" />
      <path d="M27 9.5 15.5 24.5" fill="none" stroke="#dff8ff" strokeWidth="2.2" />
      <path d="M25 23h10L20 41Z" fill="#138dbb" stroke="none" /><path d="m24 14-7 9" fill="none" stroke="#ffffff" strokeWidth="1.4" />
    </Svg>
  )
}

export function CrownIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 38h32v5H8Z" fill="#c98a1c" />
      <path d="M8 36 5 14l11 9 8-15 8 15 11-9-3 22Z" fill="#ffc94a" />
      <circle cx="24" cy="27" r="3.4" fill="#ff4d5e" strokeWidth="2" />
      <circle cx="14.5" cy="29.5" r="2.4" fill="#45d4ff" strokeWidth="1.8" />
      <circle cx="33.5" cy="29.5" r="2.4" fill="#45d4ff" strokeWidth="1.8" />
      <path d="M10 21 12 33" fill="none" stroke="#fff1b8" strokeWidth="2" />
      <path d="M36 22 40 18l-2 16H11l1-2h24Z" fill="#c98a1c" stroke="none" opacity=".65" /><path d="M11 40h26M22 13l2-4" fill="none" stroke="#fff1b8" strokeWidth="1.4" /><circle cx="14" cy="40.5" r=".7" fill="#8a5a14" stroke="none" /><circle cx="34" cy="40.5" r=".7" fill="#8a5a14" stroke="none" />
    </Svg>
  )
}

export function StopwatchIcon(props) {
  return (
    <Svg {...props}>
      <path d="M20 4h8v5h-8Z" fill="#8fa3bd" />
      <circle cx="24" cy="27" r="16" fill="#45d4ff" />
      <circle cx="24" cy="27" r="11.5" fill="#eafaff" strokeWidth="2" />
      <path d="M24 20v7l5 3" fill="none" strokeWidth="3" />
      <path d="M11 31c2 7 7 11 13 11s11-4 13-11c-3 5-7 8-13 8s-10-3-13-8Z" fill="#1686ac" stroke="none" opacity=".6" /><path d="M14 20c2-4 5-6 9-6M21 7h6" fill="none" stroke="#fff" strokeWidth="1.4" /><path d="M24 17v2M34 27h-2M14 27h2" fill="none" stroke="#7ca8b7" strokeWidth="1.4" />
    </Svg>
  )
}

export function GrowIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="24" r="10" fill="#3ccf9e" />
      <path d="M5 13V5h8M43 13V5h-8M5 35v8h8M43 35v8h-8" fill="none" strokeWidth="3.4" />
      <path d="M5 13V5h8M43 13V5h-8M5 35v8h8M43 35v8h-8" fill="none" stroke="#c8fbe6" strokeWidth="1.4" />
      <path d="M19 20c1.3-2 3-3 5-3.2" fill="none" stroke="#e9fff6" strokeWidth="2" />
      <path d="M16 27c2 4 5 6 8 6 4 0 7-2 9-6-3 2-6 3-9 3s-6-1-8-3Z" fill="#16856d" stroke="none" /><path d="M20 23h8M24 19v8" fill="none" stroke="#d9fff0" strokeWidth="1.4" />
    </Svg>
  )
}

export function SnowflakeIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="24" r="19" fill="#b9e8ff" />
      <path d="M24 9v30M11 16.5l26 15M11 31.5l26-15" fill="none" stroke="#1b6fb3" strokeWidth="3" />
      <path d="m20 11 4 4 4-4M20 37l4-4 4 4" fill="none" stroke="#1b6fb3" strokeWidth="2.4" />
      <path d="M8 29c2 8 8 13 16 13s14-5 16-13c-3 6-9 10-16 10S11 35 8 29Z" fill="#68b5dd" stroke="none" opacity=".55" /><path d="M13 15c2-3 5-5 9-5M18 22l6-3 6 3v5l-6 3-6-3Z" fill="none" stroke="#f3fdff" strokeWidth="1.4" />
    </Svg>
  )
}


export function MagnetIcon(props) {
  return (
    <Svg {...props}>
      <path d="M10 8h9v16a5 5 0 0 0 10 0V8h9v16a14 14 0 0 1-28 0Z" fill="#ff4d5e" />
      <path d="M10 8h9v7h-9ZM29 8h9v7h-9Z" fill="#dbe6f3" />
      <path d="M14 20v4a10 10 0 0 0 3 7" fill="none" stroke="#ffd0d4" strokeWidth="2" />
      <path d="M33 17h3v8c0 7-5 12-12 13 6-3 9-7 9-14Z" fill="#a5263d" stroke="none" /><path d="M12 10h5M31 10h5M13 17h4" fill="none" stroke="#fff" strokeWidth="1.4" /><path d="M12 13h5M31 13h5" fill="none" stroke="#879caf" strokeWidth="1.3" />
    </Svg>
  )
}

export function FlameIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 4c3 7 12 11 12 23a12 12 0 0 1-24 0c0-6 3-9 5-12 1 4 3 6 5 6-2-6-1-12 2-17Z" fill="#ff8a2a" />
      <path d="M24 22c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3-1-2-1-5 0-7Z" fill="#ffd34d" strokeWidth="2" />
      <path d="M29 14c5 5 6 9 6 13 0 6-3 10-7 11 3-4 4-9 2-14Z" fill="#c64a1e" stroke="none" opacity=".65" /><path d="M16 26c0-2 1-4 2-6M22 34c0-2 1-3 2-4" fill="none" stroke="#fff1a6" strokeWidth="1.5" />
    </Svg>
  )
}

export function ShieldIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 4 40 10v12c0 11-7 18-16 22C15 40 8 33 8 22V10Z" fill="#2fb6ff" />
      <path d="M24 4v40C15 40 8 33 8 22V10Z" fill="#1585d6" />
      <path d="M16 23l6 6 10-11" fill="none" stroke="#ffffff" strokeWidth="3.4" />
      <path d="M36 13v9c0 8-4 14-10 18 5-6 7-12 7-19v-9Z" fill="#075d9c" stroke="none" opacity=".6" /><path d="m12 13 9-3M12 16v5" fill="none" stroke="#bfeeff" strokeWidth="1.5" /><circle cx="35" cy="16" r=".8" fill="#eafaff" stroke="none" />
    </Svg>
  )
}

export function HeartIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 42S6 31 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 24-18 24Z" fill="#ff4d7a" />
      <path d="M12 15c1-3 3-4.5 6-4.5" fill="none" stroke="#ffd1de" strokeWidth="2.2" />
      <path d="M20 23h8M24 19v8" fill="none" stroke="#ffffff" strokeWidth="3" />
      <path d="M38 17c1 9-5 16-14 22 6-7 9-14 9-22Z" fill="#b92d55" stroke="none" opacity=".55" /><path d="M12 19c0-2 1-4 2-5" fill="none" stroke="#fff1f5" strokeWidth="1.4" />
    </Svg>
  )
}

export function LockIcon(props) {
  return (
    <Svg {...props}>
      <path d="M15 20v-6a9 9 0 0 1 18 0v6" fill="none" strokeWidth="4.5" />
      <path d="M15 20v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#8fa3bd" strokeWidth="2" />
      <rect x="9" y="20" width="30" height="22" rx="4" fill="#ffc94a" />
      <circle cx="24" cy="30" r="3" fill={INK} stroke="none" />
      <path d="M24 31v5" fill="none" strokeWidth="3" />
      <path d="M34 23h3v15a2 2 0 0 1-2 2H13l2-3h19Z" fill="#bb791a" stroke="none" /><path d="M13 25v10M15 23h8M18 14c0-3 2-5 5-6" fill="none" stroke="#fff1b8" strokeWidth="1.5" /><circle cx="34" cy="37" r=".8" fill="#78501c" stroke="none" />
    </Svg>
  )
}

export function OverclockIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="26" r="17" fill="#a96bff" />
      <path d="M12 30a12 12 0 1 1 24 0" fill="none" stroke="#efe2ff" strokeWidth="3" />
      <path d="M24 30 32 18" fill="none" strokeWidth="3.4" />
      <circle cx="24" cy="30" r="3" fill="#ffffff" />
      <path d="M9 30c2 8 8 12 15 12s13-4 15-12c-3 6-8 9-15 9S12 36 9 30Z" fill="#6939a7" stroke="none" opacity=".65" /><path d="M14 16c2-3 5-5 9-5M15 30h2M31 30h2" fill="none" stroke="#fff" strokeWidth="1.4" />
    </Svg>
  )
}


export function TempoCoreIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="25" r="18" fill="#1a6f8f" />
      <circle cx="24" cy="23" r="18" fill="#3fd0ff" />
      <circle cx="24" cy="23" r="12" fill="#0f2a44" strokeWidth="2" />
      <path d="M24 23 31 16" fill="none" stroke="#ffe27a" strokeWidth="3" />
      <circle cx="24" cy="23" r="3" fill="#ffe27a" strokeWidth="1.8" />
      <path d="M16 15.5 18 17.5M32 15.5 30 17.5M14 23h3M34 23h-3" fill="none" stroke="#9fe9ff" strokeWidth="2" />
      <path d="M9 28c2 8 8 12 15 12s13-4 15-12c-3 6-8 9-15 9S12 34 9 28Z" fill="#12526f" stroke="none" opacity=".6" /><path d="M13 17c2-4 5-6 9-7" fill="none" stroke="#e6fbff" strokeWidth="1.5" /><circle cx="35" cy="29" r=".8" fill="#e6fbff" stroke="none" />
    </Svg>
  )
}

export function StreakLensIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 24c5-9 12-14 20-14s15 5 20 14c-5 9-12 14-20 14S9 33 4 24Z" fill="#c9a2ff" />
      <circle cx="24" cy="24" r="9" fill="#5b2bb5" strokeWidth="2" />
      <circle cx="24" cy="24" r="4" fill="#f3e9ff" strokeWidth="1.8" />
      <path d="M11 20c3-4 7-6 11-6.5" fill="none" stroke="#f3e9ff" strokeWidth="2" />
      <path d="M8 27c5 6 10 9 16 9s11-3 16-9c-5 4-10 6-16 6S13 31 8 27Z" fill="#8052ba" stroke="none" opacity=".55" /><path d="M18 20c1-2 3-3 5-3" fill="none" stroke="#fff" strokeWidth="1.4" /><circle cx="27" cy="27" r=".8" fill="#9d72d9" stroke="none" />
    </Svg>
  )
}

export function PowerRigIcon(props) {
  return (
    <Svg {...props}>
      <rect x="6" y="13" width="32" height="22" rx="4" fill="#ffb03a" />
      <path d="M38 19h4v10h-4Z" fill="#c97a12" />
      <path d="M25 16 17 26h6l-2 7 9-11h-6Z" fill="#fff6d6" strokeWidth="2" />
      <path d="M10 17h8" fill="none" stroke="#ffe3a8" strokeWidth="2" />
      <path d="M33 16h3v15a2 2 0 0 1-2 2H10l2-3h21Z" fill="#bc6b11" stroke="none" opacity=".7" /><path d="M10 20v8M12 32h5M39 21h2" fill="none" stroke="#fff2c6" strokeWidth="1.4" /><circle cx="34" cy="18" r=".8" fill="#8b4e12" stroke="none" />
    </Svg>
  )
}

const MODULE_ICONS = { tempoCore: TempoCoreIcon, streakLens: StreakLensIcon, powerRig: PowerRigIcon }

export function ModuleEmblem({ slotId, ...props }) {
  const Icon = MODULE_ICONS[slotId] ?? TempoCoreIcon
  return <Icon {...props} />
}


export function AnchorIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="9" r="4.5" fill="#8fa3bd" />
      <path d="M24 13.5V40" fill="none" strokeWidth="5" />
      <path d="M24 13.5V40" fill="none" stroke="#c5d3e4" strokeWidth="2.4" />
      <path d="M16 20h16" fill="none" strokeWidth="4.5" />
      <path d="M16 20h16" fill="none" stroke="#c5d3e4" strokeWidth="2" />
      <path d="M8 28c0 9 7 14 16 14s16-5 16-14l-5 3M8 28l5 3" fill="none" strokeWidth="5" />
      <path d="M8 28c0 9 7 14 16 14s16-5 16-14" fill="none" stroke="#3fd0ff" strokeWidth="2.4" />
      <path d="M11 32c2 5 6 7 10 8M27 40c4-1 8-3 10-8" fill="none" stroke="#16799c" strokeWidth="1.5" /><path d="M22 7c1-1 2-1 3-1M22 16v19M17 19h5" fill="none" stroke="#f1f8ff" strokeWidth="1.4" />
    </Svg>
  )
}

export function VaultIcon(props) {
  return (
    <Svg {...props}>
      <rect x="6" y="8" width="36" height="32" rx="5" fill="#8fa3bd" />
      <circle cx="24" cy="24" r="10" fill="#2a3850" />
      <path d="M24 16v16M16 24h16" fill="none" stroke="#ffc94a" strokeWidth="3" />
      <path d="M10 40v4M38 40v4" fill="none" strokeWidth="3.4" />
      <path d="M37 12h3v23a3 3 0 0 1-3 3H11l3-3h23Z" fill="#526780" stroke="none" /><path d="M11 16v-3a2 2 0 0 1 2-2h16M18 20c1-2 3-3 5-3" fill="none" stroke="#e9f2ff" strokeWidth="1.5" /><circle cx="13" cy="32" r="1" fill="#dbe6f3" stroke="none" /><circle cx="35" cy="32" r="1" fill="#dbe6f3" stroke="none" />
    </Svg>
  )
}


export function RapidfireIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 12 18 24 6 36" fill="none" strokeWidth="7" />
      <path d="M6 12 18 24 6 36" fill="none" stroke="#c9a2ff" strokeWidth="3.4" />
      <path d="M18 12 30 24 18 36" fill="none" strokeWidth="7" />
      <path d="M18 12 30 24 18 36" fill="none" stroke="#e3ccff" strokeWidth="3.4" />
      <path d="M30 12 42 24 30 36" fill="none" strokeWidth="7" />
      <path d="M30 12 42 24 30 36" fill="none" stroke="#ffffff" strokeWidth="3.4" />
      <path d="m7 14 9 10-9 10M19 14l9 10-9 10M31 14l9 10-9 10" fill="none" stroke="#643a99" strokeOpacity=".55" strokeWidth="1.4" /><path d="m7 12 7 7M19 12l7 7M31 12l7 7" fill="none" stroke="#fff" strokeWidth="1.4" />
    </Svg>
  )
}

export function IronNerveIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 4 40 10v12c0 11-7 18-16 22C15 40 8 33 8 22V10Z" fill="#8fa3bd" />
      <path d="M24 9 35 13v9c0 8-5 13-11 16-6-3-11-8-11-16v-9Z" fill="#2a3850" strokeWidth="2" />
      <circle cx="24" cy="23" r="5" fill="#c9a2ff" strokeWidth="2" />
      <path d="M24 14v4M24 28v4M15 23h4M29 23h4" fill="none" stroke="#e3ccff" strokeWidth="2" />
      <path d="M36 13v9c0 8-4 14-10 18 5-6 7-12 7-18v-9Z" fill="#526780" stroke="none" opacity=".7" /><path d="m12 13 9-3M15 16v5" fill="none" stroke="#f0f6ff" strokeWidth="1.4" /><circle cx="22.5" cy="21.5" r="1" fill="#fff" stroke="none" />
    </Svg>
  )
}

export function SurgeIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="24" r="19" fill="#ffb03a" />
      <path d="M7 26c4-9 8-9 11 0s7 9 11 0 7-9 12 0" fill="none" strokeWidth="6" />
      <path d="M7 26c4-9 8-9 11 0s7 9 11 0 7-9 12 0" fill="none" stroke="#fff6d6" strokeWidth="2.8" />
      <path d="M8 30c2 7 8 12 16 12s14-5 16-12c-3 5-9 9-16 9S11 35 8 30Z" fill="#bd6a13" stroke="none" opacity=".6" /><path d="M13 15c2-3 5-5 9-5" fill="none" stroke="#fff4d2" strokeWidth="1.5" />
    </Svg>
  )
}

export function FlashpointIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 3 29 17 44 15 32 25 40 39 24 31 8 39 16 25 4 15 19 17Z" fill="#ff6a4a" />
      <path d="M24 12 27 20 35 19 29 25 33 32 24 27 15 32 19 25 13 19 21 20Z" fill="#ffe27a" strokeWidth="2" />
      <path d="m34 27 4 10-13-7 2-2 6 4-4-7Z" fill="#bb392a" stroke="none" opacity=".7" /><path d="m20 17 4-10 3 9M10 17l6 2" fill="none" stroke="#fff1b8" strokeWidth="1.4" />
    </Svg>
  )
}

const PART_ICONS = {
  tempo_anchor: AnchorIcon,
  tempo_overdrive: FlameIcon,
  tempo_bastion: ShieldIcon,
  tempo_flashpoint: FlashpointIcon,
  streak_momentum: GrowIcon,
  streak_stabilizer: TargetIcon,
  streak_rapidfire: RapidfireIcon,
  streak_ironnerve: IronNerveIcon,
  power_surge: SurgeIcon,
  power_reserve: HeartIcon,
  power_overcharge: OverclockIcon,
  power_vault: VaultIcon,
}

export function PartEmblem({ partId, slotId, ...props }) {
  const Icon = PART_ICONS[partId] ?? null
  if (Icon) return <Icon {...props} />
  return <ModuleEmblem slotId={slotId} {...props} />
}

const ROUTE_ICONS = {
  play: TargetIcon,
  armory: ArmoryIcon,
  shop: ShopIcon,
  profile: HelmetIcon,
  ladder: TrophyIcon,
  duels: SwordsIcon,
  history: ScrollIcon,
  help: HelpIcon,
  settings: GearIcon,
}

export function RouteEmblem({ routeKey, ...props }) {
  const Icon = ROUTE_ICONS[routeKey] ?? TargetIcon
  return <Icon {...props} />
}

const MODE_ICONS = { practice: DummyIcon, casual: BoltIcon, ranked: CrownIcon }

export function ModeEmblem({ tone = "casual", ...props }) {
  const Icon = MODE_ICONS[tone] ?? BoltIcon
  return <Icon {...props} />
}

const POWER_ICONS = {
  time_boost: StopwatchIcon,
  size_boost: GrowIcon,
  freeze_movement: SnowflakeIcon,
  magnet_center: MagnetIcon,
  combo_surge: FlameIcon,
  guard_charge: ShieldIcon,
  guard: ShieldIcon,
  second_wind: HeartIcon,
  size_lock: LockIcon,
  overclock: OverclockIcon,
}

export function PowerEmblem({ powerupId, ...props }) {
  const Icon = POWER_ICONS[powerupId] ?? BoltIcon
  return <Icon {...props} />
}
