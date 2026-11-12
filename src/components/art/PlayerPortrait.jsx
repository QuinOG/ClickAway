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

function Face({ color = "#e9aa7f" }) {
  return <>
    <path d="M20 25q0-13 12-13t12 13v14q-2 11-12 11T20 39Z" fill={color}/>
    <path d="M37 15q7 3 7 10v14q-2 11-12 11-4 0-6-3 12 2 13-10Z" fill="#492635" opacity=".28" stroke="none"/>
    <path d="M23 27q3-2 6 0m6 0q3-2 6 0" fill="none" strokeWidth="1.5"/>
    <path d="M23 32q3-2 6 0-3 3-6 0Zm12 0q3-2 6 0-3 3-6 0Z" fill="#f5f4df" strokeWidth="1.2"/>
    <circle cx="27" cy="32" r="1.4" fill={INK} stroke="none"/><circle cx="38" cy="32" r="1.4" fill={INK} stroke="none"/>
    <path d="M27 31h.1m11 0h.1" stroke="#fff" strokeWidth="1.5"/>
    <path d="M31 38q2 1 3 0m-5 5q4 2 8-1" fill="none" strokeWidth="1.4"/>
  </>
}

function Gear({ type, color }) {
  switch (type) {
    case 0: return <>
      <path d="M12 37V29C12 16 20 9 32 9s20 7 20 20v8l-5 8H17Z" fill={color}/>
      <path d="M39 10q13 4 13 19v8l-5 8H28q16-4 17-15 1-12-6-20Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="M15 28q17-8 34 0v9q-17 8-34 0Z" fill="#142b40"/>
      <path d="M16 35q17 5 33-1v3q-17 8-34 0Z" fill={INK} opacity=".45" stroke="none"/>
      <path d="m20 31 10-3m4 1 9 1M18 21q4-7 12-8" fill="none" stroke="#aaf4ff" strokeWidth="1.5"/>
      <path d="m23 34 5 1m8 0 5-1" stroke="#fff" strokeWidth="1.4"/>
      <path d="M23 41q9 3 18 0" fill="none" strokeWidth="1.4"/>
    </>
    case 1: return <>
      <Face/><path d="M16 25q0-16 16-16 13 0 15 13l-17-2-14 8Z" fill={color}/>
      <path d="M34 10q12 1 13 12l-11-1Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="M15 25q15-5 34 0l-4 4H17Z" fill={color}/><path d="M30 26q10-1 19-1l-4 4H26Z" fill={INK} opacity=".25" stroke="none"/>
      <circle cx="25" cy="21" r="5" fill="#6ce0f4"/><circle cx="39" cy="21" r="5" fill="#6ce0f4"/>
      <path d="m25 23 3-4m11 4 3-4" stroke="#183a52" strokeWidth="1.5"/><path d="m23 19 2-1m12 1 2-1" stroke="#fff" strokeWidth="1.5"/>
    </>
    case 2: return <>
      <path d="M10 48 15 23Q18 8 32 7q14 1 17 16l5 25-11 5H21Z" fill={color}/>
      <path d="M36 8q11 2 13 15l5 25-11 5H32q14-8 13-22Q44 15 36 8Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="M20 29q12-12 24 0l-2 13-10 7-10-7Z" fill="#263449"/>
      <path d="m33 45 9-3 2-13-5-4q3 11-6 20Z" fill={INK} opacity=".4" stroke="none"/>
      <path d="m22 30 6-2m-5 6q3-2 6 0-3 3-6 0Z" fill="#fff" strokeWidth="1.3"/><circle cx="27" cy="34" r="1.3" fill={INK} stroke="none"/><circle cx="27.4" cy="33.5" r=".5" fill="#fff" stroke="none"/>
      <circle cx="37" cy="32" r="6" fill="#ffcc55"/><circle cx="37" cy="32" r="2.5" fill="#263449"/><circle cx="38" cy="31" r=".9" fill="#fff" stroke="none"/>
      <path d="M28 42q4 2 8-1M17 24q2-10 10-13" fill="none" strokeWidth="1.4"/>
    </>
    case 3: return <>
      <path d="M26 14Q21 5 29 3l3 5 4-5q8 3 3 11Z" fill="#f66b50"/><path d="M36 4q6 3 3 10h-7Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="M14 31q0-19 18-19t18 19v13l-9 5-3-13H26l-3 13-9-5Z" fill={color}/>
      <path d="M36 13q14 2 14 18v13l-9 5-3-13h-3q9-12 1-23Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="M19 29h26M32 21v22" fill="none"/><path d="m21 33 8 1m6 0 8-1" strokeWidth="3"/><path d="m24 34 3 .3m10 0 3-.3" stroke="#fff" strokeWidth="1.2"/>
      <path d="M17 25q3-8 11-10m-3 28 4 2m6 0 4-2" fill="none" strokeWidth="1.4"/>
    </>
    case 4: return <>
      <Face/>
      <path d="M19 27q-3-18 13-19 15 0 14 19l-4-4-3-6-5 3-7-3-5 9Z" fill={color}/>
      <path d="M34 9q12 0 12 18l-4-4-3-6-5 3-3-2q7-3 3-9Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="M22 17q10-5 20 0l-1 7q-9-3-18 0Z" fill="#29445d"/>
      <path d="M23 21q9-2 18 0v3q-9-3-18 0Z" fill={INK} opacity=".4" stroke="none"/>
      <path d="m26 18 6-2m4 1 3 1" stroke="#9df5ff" strokeWidth="1.5"/>
      <path d="M17 32v-6q0-18 15-18t15 18v7" fill="none" strokeWidth="4"/>
      <rect x="12" y="27" width="8" height="13" rx="3" fill="#526e8b"/><rect x="44" y="27" width="8" height="13" rx="3" fill="#526e8b"/>
      <path d="M17 28h2v11h-2Zm32 0h2v11h-2Z" fill={INK} opacity=".35" stroke="none"/>
      <path d="M15 31v5m32-5v5m2-5v5" fill="none" strokeWidth="1.3"/>
      <path d="M49 39q0 8-10 8" fill="none" strokeWidth="1.8"/><ellipse cx="38" cy="47" rx="2.5" ry="1.8" fill="#263449"/>
    </>
    case 5: return <>
      <Face/><path d="M24 22 22 8l8 5 4-9 3 10 8-4-3 14-10-5Z" fill={color}/>
      <path d="m34 4 3 10 8-4-3 14-10-5 5-2Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="m25 13 3 3m6-7 1 5" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4"/>
      <path d="M18 27h8v15h-8Z" fill="#697f98"/><path d="M23 28h3v14h-3Z" fill={INK} opacity=".3" stroke="none"/><path d="M20 30h3m-3 9h3" strokeWidth="1.3"/>
    </>
    case 6: return <>
      <path d="M17 22 23 12h18l6 10v21l-8 8H25l-8-8Z" fill={color}/>
      <path d="M37 12h4l6 10v21l-8 8H28q13-6 13-17V22Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="M20 28h24v10H20Z" fill="#23364c"/><path d="M21 35h22v3H21Z" fill={INK} opacity=".45" stroke="none"/>
      <path d="m23 31 6 1m6 0 6-1" stroke="#81f9e2" strokeWidth="2.5"/><path d="m25 31 1-.5m11 .5 1-.5" stroke="#fff" strokeWidth="1.2"/>
      <path d="M26 44h12m-10 3h8M32 12V6m-4 0h8M21 22l4-6" fill="none" strokeWidth="1.4"/><circle cx="22" cy="42" r="1" fill={INK} stroke="none"/><circle cx="42" cy="42" r="1" fill={INK} stroke="none"/>
    </>
    default: return <>
      <Face/><path d="M17 23q1-13 15-13t15 13l-2 5q-13-5-26 0Z" fill={color}/>
      <path d="M34 10q13 1 13 13l-2 5-10-3q7-6-1-15Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="m45 20 8 4-5 5 5 5-9-2" fill={color}/><path d="m48 29 5 5-9-2Z" fill={INK} opacity=".3" stroke="none"/>
      <path d="M21 20q5-5 12-5m-13 9q12-4 23 0m-4 15 3 2-3 2" fill="none" strokeWidth="1.4"/>
    </>
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
      <path d="M10 61q3-9 13-11l4 4-3 10H9Z" fill="#5a7190"/>
      <path d="m11 59 13-5-1 3-13 5Z" fill={color} stroke="none"/>
      <path d="M12 57q3-5 9-6m20 1q7 2 10 7" fill="none" stroke="#c7e8f4" strokeOpacity=".65" strokeWidth="1.4"/>
      <Gear type={type} color={color}/>
    </g>
    <path d="M21 17q4-4 9-4" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
}
