const INK = "#040912"
const COLORS = ["#ffc94a", "#3fd0ff", "#ff6b6b", "#9ff0c9", "#c9a2ff", "#f4b477", "#ff9a4a", "#dbe6f3"]
const BACKGROUNDS = ["#245ba5", "#197d70", "#a43f31", "#613ca4", "#aa701c", "#257fa5", "#a12e65", "#477d37"]
const RIVALS = { nova: 0, orbit: 1, kestrel: 2, prism: 3, vector: 4 }

function hashName(name) {
  let hash = 2166136261
  for (const char of String(name).toLowerCase()) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function Gear({ type, color }) {
  const face = "#e9aa7f"
  switch (type) {
    case 0: return <><path d="M12 37V29C12 16 20 9 32 9s20 7 20 20v8l-5 8H17Z" fill={color}/><path d="M15 28q17-8 34 0v9q-17 8-34 0Z" fill="#142b40"/><path d="M20 31h23" stroke="#80eaff" strokeWidth="3"/></>
    case 1: return <><path d="M19 27q0-14 13-14t13 14v12q-2 10-13 11-11-1-13-11Z" fill={face}/><path d="M16 25q0-16 16-16 13 0 15 13l-17-2-14 8Z" fill={color}/><path d="M15 25q15-5 34 0l-4 4H17Z" fill={color}/><circle cx="25" cy="21" r="5" fill="#6ce0f4"/><circle cx="39" cy="21" r="5" fill="#6ce0f4"/><path d="M26 36h2m8 0h2M29 43q3 2 6 0" fill="none"/></>
    case 2: return <><path d="M10 48 15 23Q18 8 32 7q14 1 17 16l5 25-11 5H21Z" fill={color}/><path d="M20 29q12-12 24 0l-2 13-10 7-10-7Z" fill="#263449"/><circle cx="37" cy="32" r="6" fill="#ffcc55"/><circle cx="37" cy="32" r="2" fill={INK}/><path d="M22 36h7" fill="none" stroke="#fff"/></>
    case 3: return <><path d="M26 14Q21 5 29 3l3 5 4-5q8 3 3 11Z" fill="#f66b50"/><path d="M14 31q0-19 18-19t18 19v13l-9 5-3-13H26l-3 13-9-5Z" fill={color}/><path d="M19 29h26M32 21v22" fill="none"/><path d="M22 33h7m6 0h7" stroke="#101f30" strokeWidth="4"/></>
    case 4: return <><path d="M20 25q0-15 12-15t12 15v14q-2 11-12 11T20 39Z" fill={face}/><path d="M19 26q-3-17 13-18 13 0 14 15l-8-5-5 5-7-4Z" fill={color}/><path d="M17 32v-6q0-18 15-18t15 18v7" fill="none" strokeWidth="4"/><rect x="12" y="27" width="8" height="13" rx="3" fill="#344c68"/><rect x="44" y="27" width="8" height="13" rx="3" fill="#344c68"/><path d="M49 39q0 7-10 7M25 34h2m10 0h2" fill="none"/></>
    case 5: return <><path d="M20 25q0-13 12-13t12 13v15q-2 10-12 10T20 40Z" fill={face}/><path d="M24 18 22 8l8 5 4-9 3 10 8-4-3 14-10-5Z" fill={color}/><path d="M18 27h8v15h-8Z" fill="#697f98"/><path d="M29 35h2m7 0h2M31 43h6" fill="none"/></>
    case 6: return <><path d="M17 22 23 12h18l6 10v21l-8 8H25l-8-8Z" fill={color}/><path d="M20 28h24v10H20Z" fill="#23364c"/><path d="M24 33h5m6 0h5" stroke="#81f9e2" strokeWidth="3"/><path d="M26 44h12M32 12V6m-4 0h8" fill="none"/></>
    default: return <><path d="M19 26q0-14 13-14t13 14v13q-2 11-13 11T19 39Z" fill={face}/><path d="M17 23q1-13 15-13t15 13l-2 5q-13-5-26 0Z" fill={color}/><path d="m45 20 8 4-5 5 5 5-9-2" fill={color}/><path d="M24 35h3m9 0h3M29 43q3 2 6 0" fill="none"/><path d="m39 39 3 2-3 2" fill="none" stroke="#ef514e"/></>
  }
}

export default function PlayerPortrait({ name = "Player", size = 48, className = "", title }) {
  const hash = hashName(name)
  const type = RIVALS[String(name).toLowerCase()] ?? hash % 8
  const color = COLORS[(hash >>> 3) % COLORS.length]
  return <svg className={`playerPortrait ${className}`.trim()} width={size} height={size} viewBox="0 0 64 64" role={title ? "img" : undefined} aria-hidden={title ? undefined : "true"} focusable="false">
    {title ? <title>{title}</title> : null}
    <rect width="64" height="64" fill={BACKGROUNDS[hash % BACKGROUNDS.length]}/>
    <path d="M0 50 64 31v33H0Z" fill="#040912" opacity=".18"/>
    <g stroke={INK} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M7 65q2-14 17-17l8 5 8-5q15 3 17 17Z" fill="#405779"/>
      <path d="M34 55q12-1 18 9H34Z" fill="#293b58" stroke="none"/>
      <Gear type={type} color={color}/>
    </g>
    <path d="M21 17q4-4 9-4" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
}
