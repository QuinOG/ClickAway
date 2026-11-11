// Painted stadium behind the play field. Shapes carry their own inline fills
// because game-play.css sets `.arenaWorldArt path { fill: none }`.
const ink = "#040912"
const f = (fill, stroke = "none", strokeWidth = 0) => ({ fill, stroke, strokeWidth })

// Truss web: alternating diagonals between the roof's two chords.
const quad = (end, ctrl, t) => end * (1 - t) ** 2 + 2 * t * (1 - t) * ctrl + end * t * t
const TRUSS = Array.from({ length: 23 }, (_, i) => {
  const x0 = 30 + i * 50
  const x1 = Math.min(x0 + 50, 1170)
  const top = (x) => quad(106, -6, (x - 30) / 1140)
  const low = (x) => quad(136, 22, (x - 30) / 1140)
  return i % 2
    ? `M${x0} ${low(x0).toFixed(1)}L${x1} ${top(x1).toFixed(1)}`
    : `M${x0} ${top(x0).toFixed(1)}L${x1} ${low(x1).toFixed(1)}`
}).join("")

const SEAT_ROWS = [204, 216, 228, 240, 252]

export default function ArenaWorldArt({ className = "" }) {
  return (
    <svg
      className={`arenaWorldArt ${className}`.trim()}
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="awaWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070f20" />
          <stop offset="1" stopColor="#13284a" />
        </linearGradient>
        <linearGradient id="awaSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a5476" />
          <stop offset=".45" stopColor="#1f324d" />
          <stop offset="1" stopColor="#111d30" />
        </linearGradient>
        <linearGradient id="awaStand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14223a" />
          <stop offset="1" stopColor="#0b1527" />
        </linearGradient>
        <linearGradient id="awaBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2cf" stopOpacity=".34" />
          <stop offset=".7" stopColor="#ffd88a" stopOpacity=".07" />
          <stop offset="1" stopColor="#ffd88a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="awaScreen" cx=".5" cy=".45" r=".7">
          <stop offset="0" stopColor="#1f5f8f" />
          <stop offset="1" stopColor="#081b31" />
        </radialGradient>
        <linearGradient id="awaBoard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1030" />
          <stop offset="1" stopColor="#0a0814" />
        </linearGradient>
        <pattern id="awaScan" width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" opacity=".28" />
        </pattern>
      </defs>

      {/* back wall */}
      <rect className="awaWall" x="0" y="0" width="1200" height="300" style={f("url(#awaWall)")} />

      {/* light beams from the rig, drawn first so stands sit in the light */}
      <g className="awaBeams">
        <polygon points="250,118 330,118 470,600 60,600" style={f("url(#awaBeam)")} />
        <polygon points="870,118 950,118 1140,600 730,600" style={f("url(#awaBeam)")} />
      </g>

      {/* side stands: tiered blocks with seat rows */}
      <g className="awaSideStands">
        <polygon points="0,150 214,150 228,246 0,246" style={f("url(#awaStand)", ink, 3)} />
        <polygon points="1200,150 986,150 972,246 1200,246" style={f("url(#awaStand)", ink, 3)} />
        {[172, 194, 216].map((y) => (
          <g key={y}>
            <rect x="0" y={y} width="220" height="3" style={f("#22375a")} />
            <rect x="980" y={y} width="220" height="3" style={f("#22375a")} />
          </g>
        ))}
        <rect x="0" y="146" width="216" height="6" style={f("#2c4566", ink, 2)} />
        <rect x="984" y="146" width="216" height="6" style={f("#2c4566", ink, 2)} />
      </g>

      {/* main stand */}
      <g className="awaMainStand">
        <polygon points="200,268 238,188 962,188 1000,268" style={f("url(#awaStand)", ink, 3)} />
        {SEAT_ROWS.map((y) => (
          <rect key={y} x={238 - (y - 188) * 0.475} y={y} width={724 + (y - 188) * 0.95} height="3" style={f("#21365a")} />
        ))}
        {/* aisles */}
        {[400, 600, 800].map((x) => (
          <polygon key={x} points={`${x - 6},188 ${x + 6},188 ${x + 10 + (x - 600) * 0.06},268 ${x - 10 + (x - 600) * 0.06},268`} style={f("#0a1324")} />
        ))}
      </g>

      <g className="arenaWorldCrowd">
        <path d="M233.8 218.9q0-12 9.2-12q9.2 0 9.2 12z" style={{ fill: "#3a2a5a" }} /><circle cx="243" cy="202.3" r="5.1" style={{ fill: "#3a2a5a" }} />
        <path d="M255.1 217.0q0-12 7.9-12q7.9 0 7.9 12z" style={{ fill: "#1d3a44" }} /><circle cx="263" cy="202.9" r="4.3" style={{ fill: "#1d3a44" }} />
        <path d="M273.3 213.7q0-12 7.7-12q7.7 0 7.7 12z" style={{ fill: "#2b4670" }} /><circle cx="281" cy="199.9" r="4.2" style={{ fill: "#2b4670" }} />
        <path d="M290.3 214.2q0-12 8.7-12q8.7 0 8.7 12z" style={{ fill: "#3a2a5a" }} /><circle cx="299" cy="198.5" r="4.8" style={{ fill: "#3a2a5a" }} />
        <path d="M313 208l-4 -14" style={{ stroke: "#1d3a44", strokeWidth: 3.5, strokeLinecap: "round", fill: "none" }} /><path d="M309.2 218.3q0-12 8.8-12q8.8 0 8.8 12z" style={{ fill: "#1d3a44" }} /><circle cx="318" cy="202.5" r="4.8" style={{ fill: "#1d3a44" }} />
        <path d="M328.4 212.6q0-12 7.6-12q7.6 0 7.6 12z" style={{ fill: "#22395c" }} /><circle cx="336" cy="199.0" r="4.2" style={{ fill: "#22395c" }} />
        <path d="M344.9 214.7q0-12 9.1-12q9.1 0 9.1 12z" style={{ fill: "#2b4670" }} /><circle cx="354" cy="198.4" r="5.0" style={{ fill: "#2b4670" }} />
        <path d="M365.5 215.0q0-12 8.5-12q8.5 0 8.5 12z" style={{ fill: "#2b4670" }} /><circle cx="374" cy="199.6" r="4.7" style={{ fill: "#2b4670" }} />
        <path d="M384.6 213.8q0-12 8.4-12q8.4 0 8.4 12z" style={{ fill: "#2b4670" }} /><circle cx="393" cy="198.6" r="4.6" style={{ fill: "#2b4670" }} />
        <path d="M402.1 214.5q0-12 8.9-12q8.9 0 8.9 12z" style={{ fill: "#2b4670" }} /><circle cx="411" cy="198.4" r="4.9" style={{ fill: "#2b4670" }} />
        <path d="M421.5 214.6q0-12 7.5-12q7.5 0 7.5 12z" style={{ fill: "#1d3a44" }} /><circle cx="429" cy="201.0" r="4.1" style={{ fill: "#1d3a44" }} />
        <path d="M440 204l-5 -15" style={{ stroke: "#3a2a5a", strokeWidth: 3.7, strokeLinecap: "round", fill: "none" }} /><path d="M436.8 214.9q0-12 9.2-12q9.2 0 9.2 12z" style={{ fill: "#3a2a5a" }} /><circle cx="446" cy="198.3" r="5.1" style={{ fill: "#3a2a5a" }} />
        <path d="M452.1 213.1q0-12 7.9-12q7.9 0 7.9 12z" style={{ fill: "#1a2d4a" }} /><circle cx="460" cy="198.8" r="4.4" style={{ fill: "#1a2d4a" }} />
        <path d="M470.7 216.7q0-12 8.3-12q8.3 0 8.3 12z" style={{ fill: "#1d3a44" }} /><circle cx="479" cy="201.7" r="4.6" style={{ fill: "#1d3a44" }} />
        <path d="M490.8 215.4q0-12 8.2-12q8.2 0 8.2 12z" style={{ fill: "#2b4670" }} /><circle cx="499" cy="200.7" r="4.5" style={{ fill: "#2b4670" }} />
        <path d="M511 204l-4 -12" style={{ stroke: "#1a2d4a", strokeWidth: 3.1, strokeLinecap: "round", fill: "none" }} /><path d="M508.2 212.9q0-12 7.8-12q7.8 0 7.8 12z" style={{ fill: "#1a2d4a" }} /><circle cx="516" cy="198.9" r="4.3" style={{ fill: "#1a2d4a" }} />
        <path d="M525.2 216.0q0-12 7.8-12q7.8 0 7.8 12z" style={{ fill: "#1d3a44" }} /><circle cx="533" cy="201.9" r="4.3" style={{ fill: "#1d3a44" }} />
        <path d="M541.5 216.3q0-12 9.5-12q9.5 0 9.5 12z" style={{ fill: "#22395c" }} /><circle cx="551" cy="199.2" r="5.2" style={{ fill: "#22395c" }} />
        <path d="M563 204l-4 -13" style={{ stroke: "#22395c", strokeWidth: 3.3, strokeLinecap: "round", fill: "none" }} /><path d="M559.7 213.6q0-12 8.3-12q8.3 0 8.3 12z" style={{ fill: "#22395c" }} /><circle cx="568" cy="198.7" r="4.6" style={{ fill: "#22395c" }} />
        <path d="M579.9 217.3q0-12 8.1-12q8.1 0 8.1 12z" style={{ fill: "#1a2d4a" }} /><circle cx="588" cy="202.8" r="4.5" style={{ fill: "#1a2d4a" }} />
        <path d="M600 208l-4 -14" style={{ stroke: "#1a2d4a", strokeWidth: 3.5, strokeLinecap: "round", fill: "none" }} /><path d="M596.2 218.3q0-12 8.8-12q8.8 0 8.8 12z" style={{ fill: "#1a2d4a" }} /><circle cx="605" cy="202.5" r="4.8" style={{ fill: "#1a2d4a" }} />
        <path d="M611.6 214.7q0-12 8.4-12q8.4 0 8.4 12z" style={{ fill: "#1a2d4a" }} /><circle cx="620" cy="199.6" r="4.6" style={{ fill: "#1a2d4a" }} />
        <path d="M631 206l-4 -13" style={{ stroke: "#1a2d4a", strokeWidth: 3.3, strokeLinecap: "round", fill: "none" }} /><path d="M627.7 215.6q0-12 8.3-12q8.3 0 8.3 12z" style={{ fill: "#1a2d4a" }} /><circle cx="636" cy="200.7" r="4.5" style={{ fill: "#1a2d4a" }} />
        <path d="M646.5 213.5q0-12 7.5-12q7.5 0 7.5 12z" style={{ fill: "#2b4670" }} /><circle cx="654" cy="200.0" r="4.1" style={{ fill: "#2b4670" }} />
        <path d="M661.6 216.2q0-12 9.4-12q9.4 0 9.4 12z" style={{ fill: "#3a2a5a" }} /><circle cx="671" cy="199.2" r="5.2" style={{ fill: "#3a2a5a" }} />
        <path d="M678.1 216.0q0-12 7.9-12q7.9 0 7.9 12z" style={{ fill: "#22395c" }} /><circle cx="686" cy="201.9" r="4.3" style={{ fill: "#22395c" }} />
        <path d="M693.0 217.2q0-12 8.0-12q8.0 0 8.0 12z" style={{ fill: "#22395c" }} /><circle cx="701" cy="202.8" r="4.4" style={{ fill: "#22395c" }} />
        <path d="M712.1 217.0q0-12 7.9-12q7.9 0 7.9 12z" style={{ fill: "#3a2a5a" }} /><circle cx="720" cy="202.8" r="4.3" style={{ fill: "#3a2a5a" }} />
        <path d="M733 204l-4 -13" style={{ stroke: "#1a2d4a", strokeWidth: 3.3, strokeLinecap: "round", fill: "none" }} /><path d="M729.7 213.7q0-12 8.3-12q8.3 0 8.3 12z" style={{ fill: "#1a2d4a" }} /><circle cx="738" cy="198.7" r="4.6" style={{ fill: "#1a2d4a" }} />
        <path d="M748.0 215.2q0-12 8.0-12q8.0 0 8.0 12z" style={{ fill: "#3a2a5a" }} /><circle cx="756" cy="200.8" r="4.4" style={{ fill: "#3a2a5a" }} />
        <path d="M767.5 217.9q0-12 8.5-12q8.5 0 8.5 12z" style={{ fill: "#1d3a44" }} /><circle cx="776" cy="202.6" r="4.7" style={{ fill: "#1d3a44" }} />
        <path d="M787.3 212.8q0-12 7.7-12q7.7 0 7.7 12z" style={{ fill: "#3a2a5a" }} /><circle cx="795" cy="198.9" r="4.3" style={{ fill: "#3a2a5a" }} />
        <path d="M806.3 218.2q0-12 8.7-12q8.7 0 8.7 12z" style={{ fill: "#2b4670" }} /><circle cx="815" cy="202.5" r="4.8" style={{ fill: "#2b4670" }} />
        <path d="M822.4 212.7q0-12 7.6-12q7.6 0 7.6 12z" style={{ fill: "#3a2a5a" }} /><circle cx="830" cy="199.0" r="4.2" style={{ fill: "#3a2a5a" }} />
        <path d="M836.2 213.0q0-12 7.8-12q7.8 0 7.8 12z" style={{ fill: "#2b4670" }} /><circle cx="844" cy="198.9" r="4.3" style={{ fill: "#2b4670" }} />
        <path d="M850.8 213.5q0-12 8.2-12q8.2 0 8.2 12z" style={{ fill: "#3a2a5a" }} /><circle cx="859" cy="198.7" r="4.5" style={{ fill: "#3a2a5a" }} />
        <path d="M869.3 218.1q0-12 8.7-12q8.7 0 8.7 12z" style={{ fill: "#22395c" }} /><circle cx="878" cy="202.5" r="4.8" style={{ fill: "#22395c" }} />
        <path d="M882.7 218.1q0-12 9.3-12q9.3 0 9.3 12z" style={{ fill: "#2b4670" }} /><circle cx="892" cy="201.3" r="5.1" style={{ fill: "#2b4670" }} />
        <path d="M901 208l-4 -14" style={{ stroke: "#3a2a5a", strokeWidth: 3.5, strokeLinecap: "round", fill: "none" }} /><path d="M897.2 218.3q0-12 8.8-12q8.8 0 8.8 12z" style={{ fill: "#3a2a5a" }} /><circle cx="906" cy="202.5" r="4.8" style={{ fill: "#3a2a5a" }} />
        <path d="M917 206l-4 -12" style={{ stroke: "#1a2d4a", strokeWidth: 3.1, strokeLinecap: "round", fill: "none" }} /><path d="M914.2 214.9q0-12 7.8-12q7.8 0 7.8 12z" style={{ fill: "#1a2d4a" }} /><circle cx="922" cy="200.9" r="4.3" style={{ fill: "#1a2d4a" }} />
        <path d="M931.0 216.6q0-12 9.0-12q9.0 0 9.0 12z" style={{ fill: "#22395c" }} /><circle cx="940" cy="200.4" r="4.9" style={{ fill: "#22395c" }} />
        <path d="M948.3 214.7q0-12 7.7-12q7.7 0 7.7 12z" style={{ fill: "#3a2a5a" }} /><circle cx="956" cy="200.9" r="4.2" style={{ fill: "#3a2a5a" }} />
        <path d="M227 222l-5 -17" style={{ stroke: "#1d3a44", strokeWidth: 4.3, strokeLinecap: "round", fill: "none" }} /><path d="M223.1 235.2q0-12 10.9-12q10.9 0 10.9 12z" style={{ fill: "#1d3a44" }} /><circle cx="234" cy="215.7" r="6.0" style={{ fill: "#1d3a44" }} />
        <path d="M251 225l-5 -16" style={{ stroke: "#1d3a44", strokeWidth: 4.1, strokeLinecap: "round", fill: "none" }} /><path d="M246.8 237.3q0-12 10.2-12q10.2 0 10.2 12z" style={{ fill: "#1d3a44" }} /><circle cx="257" cy="218.9" r="5.6" style={{ fill: "#1d3a44" }} />
        <path d="M263.8 235.7q0-12 11.2-12q11.2 0 11.2 12z" style={{ fill: "#3a2a5a" }} /><circle cx="275" cy="215.5" r="6.2" style={{ fill: "#3a2a5a" }} />
        <path d="M288.1 237.9q0-12 9.9-12q9.9 0 9.9 12z" style={{ fill: "#3a2a5a" }} /><circle cx="298" cy="220.0" r="5.4" style={{ fill: "#3a2a5a" }} />
        <path d="M305.4 238.8q0-12 10.6-12q10.6 0 10.6 12z" style={{ fill: "#1a2d4a" }} /><circle cx="316" cy="219.8" r="5.8" style={{ fill: "#1a2d4a" }} />
        <path d="M325.1 235.4q0-12 8.9-12q8.9 0 8.9 12z" style={{ fill: "#1a2d4a" }} /><circle cx="334" cy="219.5" r="4.9" style={{ fill: "#1a2d4a" }} />
        <path d="M347.0 237.3q0-12 11.0-12q11.0 0 11.0 12z" style={{ fill: "#2b4670" }} /><circle cx="358" cy="217.6" r="6.0" style={{ fill: "#2b4670" }} />
        <path d="M368.8 236.9q0-12 9.2-12q9.2 0 9.2 12z" style={{ fill: "#2b4670" }} /><circle cx="378" cy="220.3" r="5.1" style={{ fill: "#2b4670" }} />
        <path d="M391.1 238.3q0-12 10.9-12q10.9 0 10.9 12z" style={{ fill: "#2b4670" }} /><circle cx="402" cy="218.6" r="6.0" style={{ fill: "#2b4670" }} />
        <path d="M412.7 235.5q0-12 10.3-12q10.3 0 10.3 12z" style={{ fill: "#22395c" }} /><circle cx="423" cy="216.9" r="5.7" style={{ fill: "#22395c" }} />
        <path d="M435.8 235.3q0-12 10.2-12q10.2 0 10.2 12z" style={{ fill: "#2b4670" }} /><circle cx="446" cy="216.9" r="5.6" style={{ fill: "#2b4670" }} />
        <path d="M455.4 236.5q0-12 9.6-12q9.6 0 9.6 12z" style={{ fill: "#1a2d4a" }} /><circle cx="465" cy="219.1" r="5.3" style={{ fill: "#1a2d4a" }} />
        <path d="M476.9 233.7q0-12 9.1-12q9.1 0 9.1 12z" style={{ fill: "#3a2a5a" }} /><circle cx="486" cy="217.4" r="5.0" style={{ fill: "#3a2a5a" }} />
        <path d="M496.3 236.6q0-12 9.7-12q9.7 0 9.7 12z" style={{ fill: "#1d3a44" }} /><circle cx="506" cy="219.1" r="5.3" style={{ fill: "#1d3a44" }} />
        <path d="M518.1 237.8q0-12 9.9-12q9.9 0 9.9 12z" style={{ fill: "#1a2d4a" }} /><circle cx="528" cy="220.0" r="5.4" style={{ fill: "#1a2d4a" }} />
        <path d="M540.1 236.5q0-12 8.9-12q8.9 0 8.9 12z" style={{ fill: "#2b4670" }} /><circle cx="549" cy="220.4" r="4.9" style={{ fill: "#2b4670" }} />
        <path d="M561.2 236.4q0-12 8.8-12q8.8 0 8.8 12z" style={{ fill: "#22395c" }} /><circle cx="570" cy="220.5" r="4.9" style={{ fill: "#22395c" }} />
        <path d="M579.4 234.9q0-12 10.6-12q10.6 0 10.6 12z" style={{ fill: "#2b4670" }} /><circle cx="590" cy="215.7" r="5.9" style={{ fill: "#2b4670" }} />
        <path d="M597.8 235.6q0-12 11.2-12q11.2 0 11.2 12z" style={{ fill: "#1a2d4a" }} /><circle cx="609" cy="215.5" r="6.1" style={{ fill: "#1a2d4a" }} />
        <path d="M620.6 234.6q0-12 10.4-12q10.4 0 10.4 12z" style={{ fill: "#22395c" }} /><circle cx="631" cy="215.8" r="5.7" style={{ fill: "#22395c" }} />
        <path d="M641.5 235.7q0-12 10.5-12q10.5 0 10.5 12z" style={{ fill: "#3a2a5a" }} /><circle cx="652" cy="216.8" r="5.8" style={{ fill: "#3a2a5a" }} />
        <path d="M659.7 234.1q0-12 9.3-12q9.3 0 9.3 12z" style={{ fill: "#2b4670" }} /><circle cx="669" cy="217.3" r="5.1" style={{ fill: "#2b4670" }} />
        <path d="M681 225l-5 -17" style={{ stroke: "#22395c", strokeWidth: 4.3, strokeLinecap: "round", fill: "none" }} /><path d="M677.2 238.2q0-12 10.8-12q10.8 0 10.8 12z" style={{ fill: "#22395c" }} /><circle cx="688" cy="218.7" r="6.0" style={{ fill: "#22395c" }} />
        <path d="M701.1 234.8q0-12 9.9-12q9.9 0 9.9 12z" style={{ fill: "#22395c" }} /><circle cx="711" cy="217.0" r="5.4" style={{ fill: "#22395c" }} />
        <path d="M717.9 237.2q0-12 10.1-12q10.1 0 10.1 12z" style={{ fill: "#1d3a44" }} /><circle cx="728" cy="219.0" r="5.6" style={{ fill: "#1d3a44" }} />
        <path d="M744 225l-5 -15" style={{ stroke: "#22395c", strokeWidth: 3.8, strokeLinecap: "round", fill: "none" }} /><path d="M740.4 236.4q0-12 9.6-12q9.6 0 9.6 12z" style={{ fill: "#22395c" }} /><circle cx="750" cy="219.2" r="5.3" style={{ fill: "#22395c" }} />
        <path d="M758.6 234.1q0-12 9.4-12q9.4 0 9.4 12z" style={{ fill: "#3a2a5a" }} /><circle cx="768" cy="217.2" r="5.2" style={{ fill: "#3a2a5a" }} />
        <path d="M777.9 239.6q0-12 11.1-12q11.1 0 11.1 12z" style={{ fill: "#2b4670" }} /><circle cx="789" cy="219.5" r="6.1" style={{ fill: "#2b4670" }} />
        <path d="M796.0 236.0q0-12 10.0-12q10.0 0 10.0 12z" style={{ fill: "#1a2d4a" }} /><circle cx="806" cy="218.0" r="5.5" style={{ fill: "#1a2d4a" }} />
        <path d="M819.0 236.0q0-12 10.0-12q10.0 0 10.0 12z" style={{ fill: "#1a2d4a" }} /><circle cx="829" cy="218.0" r="5.5" style={{ fill: "#1a2d4a" }} />
        <path d="M836.3 238.0q0-12 10.7-12q10.7 0 10.7 12z" style={{ fill: "#22395c" }} /><circle cx="847" cy="218.7" r="5.9" style={{ fill: "#22395c" }} />
        <path d="M856.8 235.8q0-12 9.2-12q9.2 0 9.2 12z" style={{ fill: "#1d3a44" }} /><circle cx="866" cy="219.3" r="5.0" style={{ fill: "#1d3a44" }} />
        <path d="M879.8 237.3q0-12 10.2-12q10.2 0 10.2 12z" style={{ fill: "#1a2d4a" }} /><circle cx="890" cy="218.9" r="5.6" style={{ fill: "#1a2d4a" }} />
        <path d="M903.9 238.2q0-12 10.1-12q10.1 0 10.1 12z" style={{ fill: "#1d3a44" }} /><circle cx="914" cy="219.9" r="5.6" style={{ fill: "#1d3a44" }} />
        <path d="M924.6 236.6q0-12 10.4-12q10.4 0 10.4 12z" style={{ fill: "#1d3a44" }} /><circle cx="935" cy="217.8" r="5.7" style={{ fill: "#1d3a44" }} />
        <path d="M943.9 238.1q0-12 10.1-12q10.1 0 10.1 12z" style={{ fill: "#1d3a44" }} /><circle cx="954" cy="220.0" r="5.5" style={{ fill: "#1d3a44" }} />
        <path d="M216.5 256.1q0-12 11.5-12q11.5 0 11.5 12z" style={{ fill: "#1d3a44" }} /><circle cx="228" cy="235.4" r="6.3" style={{ fill: "#1d3a44" }} />
        <path d="M243.5 256.2q0-12 11.5-12q11.5 0 11.5 12z" style={{ fill: "#3a2a5a" }} /><circle cx="255" cy="235.4" r="6.3" style={{ fill: "#3a2a5a" }} />
        <path d="M269 245l-5 -17" style={{ stroke: "#22395c", strokeWidth: 4.2, strokeLinecap: "round", fill: "none" }} /><path d="M264.6 257.5q0-12 10.4-12q10.4 0 10.4 12z" style={{ fill: "#22395c" }} /><circle cx="275" cy="238.8" r="5.7" style={{ fill: "#22395c" }} />
        <path d="M290.7 258.8q0-12 11.3-12q11.3 0 11.3 12z" style={{ fill: "#3a2a5a" }} /><circle cx="302" cy="238.5" r="6.2" style={{ fill: "#3a2a5a" }} />
        <path d="M317.5 257.7q0-12 10.5-12q10.5 0 10.5 12z" style={{ fill: "#3a2a5a" }} /><circle cx="328" cy="238.8" r="5.8" style={{ fill: "#3a2a5a" }} />
        <path d="M343.0 259.4q0-12 11.0-12q11.0 0 11.0 12z" style={{ fill: "#22395c" }} /><circle cx="354" cy="239.6" r="6.0" style={{ fill: "#22395c" }} />
        <path d="M367 244l-5 -17" style={{ stroke: "#1a2d4a", strokeWidth: 4.2, strokeLinecap: "round", fill: "none" }} /><path d="M362.5 256.7q0-12 10.5-12q10.5 0 10.5 12z" style={{ fill: "#1a2d4a" }} /><circle cx="373" cy="237.8" r="5.8" style={{ fill: "#1a2d4a" }} />
        <path d="M383.8 255.2q0-12 10.2-12q10.2 0 10.2 12z" style={{ fill: "#2b4670" }} /><circle cx="394" cy="236.9" r="5.6" style={{ fill: "#2b4670" }} />
        <path d="M406.2 257.6q0-12 11.8-12q11.8 0 11.8 12z" style={{ fill: "#1a2d4a" }} /><circle cx="418" cy="236.3" r="6.5" style={{ fill: "#1a2d4a" }} />
        <path d="M426.2 260.6q0-12 11.8-12q11.8 0 11.8 12z" style={{ fill: "#22395c" }} /><circle cx="438" cy="239.3" r="6.5" style={{ fill: "#22395c" }} />
        <path d="M451.8 255.6q0-12 11.2-12q11.2 0 11.2 12z" style={{ fill: "#3a2a5a" }} /><circle cx="463" cy="235.5" r="6.1" style={{ fill: "#3a2a5a" }} />
        <path d="M473.3 259.0q0-12 10.7-12q10.7 0 10.7 12z" style={{ fill: "#1d3a44" }} /><circle cx="484" cy="239.7" r="5.9" style={{ fill: "#1d3a44" }} />
        <path d="M498.5 258.5q0-12 12.5-12q12.5 0 12.5 12z" style={{ fill: "#1d3a44" }} /><circle cx="511" cy="236.0" r="6.9" style={{ fill: "#1d3a44" }} />
        <path d="M519.4 258.7q0-12 12.6-12q12.6 0 12.6 12z" style={{ fill: "#2b4670" }} /><circle cx="532" cy="235.9" r="7.0" style={{ fill: "#2b4670" }} />
        <path d="M545.0 259.4q0-12 11.0-12q11.0 0 11.0 12z" style={{ fill: "#22395c" }} /><circle cx="556" cy="239.6" r="6.0" style={{ fill: "#22395c" }} />
        <path d="M567.5 254.7q0-12 10.5-12q10.5 0 10.5 12z" style={{ fill: "#22395c" }} /><circle cx="578" cy="235.8" r="5.8" style={{ fill: "#22395c" }} />
        <path d="M586.8 257.7q0-12 11.2-12q11.2 0 11.2 12z" style={{ fill: "#3a2a5a" }} /><circle cx="598" cy="237.5" r="6.2" style={{ fill: "#3a2a5a" }} />
        <path d="M610.7 261.2q0-12 12.3-12q12.3 0 12.3 12z" style={{ fill: "#22395c" }} /><circle cx="623" cy="239.1" r="6.8" style={{ fill: "#22395c" }} />
        <path d="M631.3 254.9q0-12 10.7-12q10.7 0 10.7 12z" style={{ fill: "#2b4670" }} /><circle cx="642" cy="235.7" r="5.9" style={{ fill: "#2b4670" }} />
        <path d="M653.9 256.9q0-12 12.1-12q12.1 0 12.1 12z" style={{ fill: "#2b4670" }} /><circle cx="666" cy="235.2" r="6.6" style={{ fill: "#2b4670" }} />
        <path d="M681 242l-6 -18" style={{ stroke: "#1a2d4a", strokeWidth: 4.6, strokeLinecap: "round", fill: "none" }} /><path d="M676.5 256.0q0-12 11.5-12q11.5 0 11.5 12z" style={{ fill: "#1a2d4a" }} /><circle cx="688" cy="235.4" r="6.3" style={{ fill: "#1a2d4a" }} />
        <path d="M703.5 260.2q0-12 11.5-12q11.5 0 11.5 12z" style={{ fill: "#1d3a44" }} /><circle cx="715" cy="239.4" r="6.3" style={{ fill: "#1d3a44" }} />
        <path d="M726.6 255.6q0-12 10.4-12q10.4 0 10.4 12z" style={{ fill: "#22395c" }} /><circle cx="737" cy="236.8" r="5.7" style={{ fill: "#22395c" }} />
        <path d="M748.3 256.4q0-12 11.7-12q11.7 0 11.7 12z" style={{ fill: "#22395c" }} /><circle cx="760" cy="235.3" r="6.4" style={{ fill: "#22395c" }} />
        <path d="M773.8 257.1q0-12 12.2-12q12.2 0 12.2 12z" style={{ fill: "#2b4670" }} /><circle cx="786" cy="235.1" r="6.7" style={{ fill: "#2b4670" }} />
        <path d="M799.9 259.5q0-12 11.1-12q11.1 0 11.1 12z" style={{ fill: "#22395c" }} /><circle cx="811" cy="239.6" r="6.1" style={{ fill: "#22395c" }} />
        <path d="M817.5 257.4q0-12 12.5-12q12.5 0 12.5 12z" style={{ fill: "#22395c" }} /><circle cx="830" cy="235.0" r="6.8" style={{ fill: "#22395c" }} />
        <path d="M842.8 257.7q0-12 11.2-12q11.2 0 11.2 12z" style={{ fill: "#22395c" }} /><circle cx="854" cy="237.5" r="6.2" style={{ fill: "#22395c" }} />
        <path d="M861.7 261.2q0-12 12.3-12q12.3 0 12.3 12z" style={{ fill: "#2b4670" }} /><circle cx="874" cy="239.1" r="6.8" style={{ fill: "#2b4670" }} />
        <path d="M887.2 260.5q0-12 11.8-12q11.8 0 11.8 12z" style={{ fill: "#1d3a44" }} /><circle cx="899" cy="239.3" r="6.5" style={{ fill: "#1d3a44" }} />
        <path d="M912.1 257.2q0-12 10.9-12q10.9 0 10.9 12z" style={{ fill: "#1a2d4a" }} /><circle cx="923" cy="237.6" r="6.0" style={{ fill: "#1a2d4a" }} />
        <path d="M933.5 257.7q0-12 10.5-12q10.5 0 10.5 12z" style={{ fill: "#2b4670" }} /><circle cx="944" cy="238.8" r="5.8" style={{ fill: "#2b4670" }} />
        <path d="M955.8 260.1q0-12 12.2-12q12.2 0 12.2 12z" style={{ fill: "#3a2a5a" }} /><circle cx="968" cy="238.1" r="6.7" style={{ fill: "#3a2a5a" }} />
        <path d="M2 186l-4 -12" style={{ stroke: "#1a2d4a", strokeWidth: 3.0, strokeLinecap: "round", fill: "none" }} /><path d="M-0.6 194.7q0-12 7.6-12q7.6 0 7.6 12z" style={{ fill: "#1a2d4a" }} /><circle cx="7" cy="181.0" r="4.2" style={{ fill: "#1a2d4a" }} />
        <path d="M14.9 196.0q0-12 7.1-12q7.1 0 7.1 12z" style={{ fill: "#2b4670" }} /><circle cx="22" cy="183.1" r="3.9" style={{ fill: "#2b4670" }} />
        <path d="M32.3 194.8q0-12 7.7-12q7.7 0 7.7 12z" style={{ fill: "#3a2a5a" }} /><circle cx="40" cy="180.9" r="4.2" style={{ fill: "#3a2a5a" }} />
        <path d="M49.2 192.9q0-12 7.8-12q7.8 0 7.8 12z" style={{ fill: "#3a2a5a" }} /><circle cx="57" cy="178.9" r="4.3" style={{ fill: "#3a2a5a" }} />
        <path d="M70 184l-4 -14" style={{ stroke: "#1d3a44", strokeWidth: 3.4, strokeLinecap: "round", fill: "none" }} /><path d="M66.5 193.9q0-12 8.5-12q8.5 0 8.5 12z" style={{ fill: "#1d3a44" }} /><circle cx="75" cy="178.6" r="4.7" style={{ fill: "#1d3a44" }} />
        <path d="M83.5 193.8q0-12 8.5-12q8.5 0 8.5 12z" style={{ fill: "#2b4670" }} /><circle cx="92" cy="178.6" r="4.7" style={{ fill: "#2b4670" }} />
        <path d="M104 184l-4 -14" style={{ stroke: "#3a2a5a", strokeWidth: 3.4, strokeLinecap: "round", fill: "none" }} /><path d="M100.5 193.9q0-12 8.5-12q8.5 0 8.5 12z" style={{ fill: "#3a2a5a" }} /><circle cx="109" cy="178.6" r="4.7" style={{ fill: "#3a2a5a" }} />
        <path d="M116.4 194.6q0-12 7.6-12q7.6 0 7.6 12z" style={{ fill: "#2b4670" }} /><circle cx="124" cy="181.0" r="4.2" style={{ fill: "#2b4670" }} />
        <path d="M132.1 197.5q0-12 8.9-12q8.9 0 8.9 12z" style={{ fill: "#1d3a44" }} /><circle cx="141" cy="181.4" r="4.9" style={{ fill: "#1d3a44" }} />
        <path d="M145.4 197.0q0-12 8.6-12q8.6 0 8.6 12z" style={{ fill: "#1a2d4a" }} /><circle cx="154" cy="181.6" r="4.7" style={{ fill: "#1a2d4a" }} />
        <path d="M164.2 192.9q0-12 7.8-12q7.8 0 7.8 12z" style={{ fill: "#22395c" }} /><circle cx="172" cy="178.9" r="4.3" style={{ fill: "#22395c" }} />
        <path d="M181 187l-4 -13" style={{ stroke: "#1d3a44", strokeWidth: 3.2, strokeLinecap: "round", fill: "none" }} /><path d="M177.9 196.3q0-12 8.1-12q8.1 0 8.1 12z" style={{ fill: "#1d3a44" }} /><circle cx="186" cy="181.8" r="4.4" style={{ fill: "#1d3a44" }} />
        <path d="M194.4 195.6q0-12 7.6-12q7.6 0 7.6 12z" style={{ fill: "#3a2a5a" }} /><circle cx="202" cy="182.0" r="4.2" style={{ fill: "#3a2a5a" }} />
        <path d="M4.5 217.2q0-12 9.5-12q9.5 0 9.5 12z" style={{ fill: "#2b4670" }} /><circle cx="14" cy="200.2" r="5.2" style={{ fill: "#2b4670" }} />
        <path d="M23.6 215.8q0-12 8.4-12q8.4 0 8.4 12z" style={{ fill: "#22395c" }} /><circle cx="32" cy="200.6" r="4.6" style={{ fill: "#22395c" }} />
        <path d="M47 205l-5 -15" style={{ stroke: "#3a2a5a", strokeWidth: 3.7, strokeLinecap: "round", fill: "none" }} /><path d="M43.7 216.0q0-12 9.3-12q9.3 0 9.3 12z" style={{ fill: "#3a2a5a" }} /><circle cx="53" cy="199.3" r="5.1" style={{ fill: "#3a2a5a" }} />
        <path d="M66 207l-4 -14" style={{ stroke: "#2b4670", strokeWidth: 3.4, strokeLinecap: "round", fill: "none" }} /><path d="M62.5 216.9q0-12 8.5-12q8.5 0 8.5 12z" style={{ fill: "#2b4670" }} /><circle cx="71" cy="201.6" r="4.7" style={{ fill: "#2b4670" }} />
        <path d="M78.0 219.0q0-12 10.0-12q10.0 0 10.0 12z" style={{ fill: "#2b4670" }} /><circle cx="88" cy="201.0" r="5.5" style={{ fill: "#2b4670" }} />
        <path d="M95.4 215.4q0-12 9.6-12q9.6 0 9.6 12z" style={{ fill: "#3a2a5a" }} /><circle cx="105" cy="198.2" r="5.3" style={{ fill: "#3a2a5a" }} />
        <path d="M121 205l-5 -16" style={{ stroke: "#1a2d4a", strokeWidth: 3.9, strokeLinecap: "round", fill: "none" }} /><path d="M117.3 216.6q0-12 9.7-12q9.7 0 9.7 12z" style={{ fill: "#1a2d4a" }} /><circle cx="127" cy="199.1" r="5.4" style={{ fill: "#1a2d4a" }} />
        <path d="M137.4 217.1q0-12 8.6-12q8.6 0 8.6 12z" style={{ fill: "#1a2d4a" }} /><circle cx="146" cy="201.5" r="4.7" style={{ fill: "#1a2d4a" }} />
        <path d="M153.8 214.9q0-12 9.2-12q9.2 0 9.2 12z" style={{ fill: "#22395c" }} /><circle cx="163" cy="198.3" r="5.1" style={{ fill: "#22395c" }} />
        <path d="M173.0 218.5q0-12 9.0-12q9.0 0 9.0 12z" style={{ fill: "#1d3a44" }} /><circle cx="182" cy="202.4" r="4.9" style={{ fill: "#1d3a44" }} />
        <path d="M189.8 220.3q0-12 10.2-12q10.2 0 10.2 12z" style={{ fill: "#22395c" }} /><circle cx="200" cy="201.9" r="5.6" style={{ fill: "#22395c" }} />
        <path d="M984.0 194.1q0-12 8.0-12q8.0 0 8.0 12z" style={{ fill: "#1d3a44" }} /><circle cx="992" cy="179.8" r="4.4" style={{ fill: "#1d3a44" }} />
        <path d="M1002.8 197.5q0-12 8.2-12q8.2 0 8.2 12z" style={{ fill: "#2b4670" }} /><circle cx="1011" cy="182.7" r="4.5" style={{ fill: "#2b4670" }} />
        <path d="M1019.6 197.7q0-12 8.4-12q8.4 0 8.4 12z" style={{ fill: "#22395c" }} /><circle cx="1028" cy="182.6" r="4.6" style={{ fill: "#22395c" }} />
        <path d="M1039.6 193.4q0-12 7.4-12q7.4 0 7.4 12z" style={{ fill: "#22395c" }} /><circle cx="1047" cy="180.0" r="4.1" style={{ fill: "#22395c" }} />
        <path d="M1056.3 195.2q0-12 8.7-12q8.7 0 8.7 12z" style={{ fill: "#1a2d4a" }} /><circle cx="1065" cy="179.5" r="4.8" style={{ fill: "#1a2d4a" }} />
        <path d="M1070.5 194.6q0-12 7.5-12q7.5 0 7.5 12z" style={{ fill: "#1a2d4a" }} /><circle cx="1078" cy="181.0" r="4.1" style={{ fill: "#1a2d4a" }} />
        <path d="M1082.9 194.3q0-12 8.1-12q8.1 0 8.1 12z" style={{ fill: "#1a2d4a" }} /><circle cx="1091" cy="179.8" r="4.4" style={{ fill: "#1a2d4a" }} />
        <path d="M1100.9 194.3q0-12 8.1-12q8.1 0 8.1 12z" style={{ fill: "#2b4670" }} /><circle cx="1109" cy="179.8" r="4.5" style={{ fill: "#2b4670" }} />
        <path d="M1116.3 193.8q0-12 7.7-12q7.7 0 7.7 12z" style={{ fill: "#3a2a5a" }} /><circle cx="1124" cy="179.9" r="4.2" style={{ fill: "#3a2a5a" }} />
        <path d="M1134.4 194.0q0-12 8.6-12q8.6 0 8.6 12z" style={{ fill: "#3a2a5a" }} /><circle cx="1143" cy="178.6" r="4.7" style={{ fill: "#3a2a5a" }} />
        <path d="M1152.1 194.1q0-12 7.9-12q7.9 0 7.9 12z" style={{ fill: "#2b4670" }} /><circle cx="1160" cy="179.8" r="4.3" style={{ fill: "#2b4670" }} />
        <path d="M1166.7 194.3q0-12 7.3-12q7.3 0 7.3 12z" style={{ fill: "#1d3a44" }} /><circle cx="1174" cy="181.1" r="4.0" style={{ fill: "#1d3a44" }} />
        <path d="M1183.1 194.0q0-12 7.9-12q7.9 0 7.9 12z" style={{ fill: "#2b4670" }} /><circle cx="1191" cy="179.9" r="4.3" style={{ fill: "#2b4670" }} />
        <path d="M985.4 215.4q0-12 9.6-12q9.6 0 9.6 12z" style={{ fill: "#3a2a5a" }} /><circle cx="995" cy="198.2" r="5.3" style={{ fill: "#3a2a5a" }} />
        <path d="M1009 207l-5 -14" style={{ stroke: "#1a2d4a", strokeWidth: 3.6, strokeLinecap: "round", fill: "none" }} /><path d="M1005.0 217.7q0-12 9.0-12q9.0 0 9.0 12z" style={{ fill: "#1a2d4a" }} /><circle cx="1014" cy="201.4" r="5.0" style={{ fill: "#1a2d4a" }} />
        <path d="M1022.5 218.0q0-12 8.5-12q8.5 0 8.5 12z" style={{ fill: "#2b4670" }} /><circle cx="1031" cy="202.6" r="4.7" style={{ fill: "#2b4670" }} />
        <path d="M1044.0 216.6q0-12 9.0-12q9.0 0 9.0 12z" style={{ fill: "#22395c" }} /><circle cx="1053" cy="200.4" r="5.0" style={{ fill: "#22395c" }} />
        <path d="M1064.8 216.9q0-12 9.2-12q9.2 0 9.2 12z" style={{ fill: "#1a2d4a" }} /><circle cx="1074" cy="200.3" r="5.1" style={{ fill: "#1a2d4a" }} />
        <path d="M1083.3 219.6q0-12 9.7-12q9.7 0 9.7 12z" style={{ fill: "#2b4670" }} /><circle cx="1093" cy="202.1" r="5.3" style={{ fill: "#2b4670" }} />
        <path d="M1105.6 217.2q0-12 9.4-12q9.4 0 9.4 12z" style={{ fill: "#22395c" }} /><circle cx="1115" cy="200.2" r="5.2" style={{ fill: "#22395c" }} />
        <path d="M1127.1 218.5q0-12 8.9-12q8.9 0 8.9 12z" style={{ fill: "#2b4670" }} /><circle cx="1136" cy="202.4" r="4.9" style={{ fill: "#2b4670" }} />
        <path d="M1142.1 217.9q0-12 9.9-12q9.9 0 9.9 12z" style={{ fill: "#1d3a44" }} /><circle cx="1152" cy="200.0" r="5.4" style={{ fill: "#1d3a44" }} />
        <path d="M1159.8 218.9q0-12 9.2-12q9.2 0 9.2 12z" style={{ fill: "#3a2a5a" }} /><circle cx="1169" cy="202.3" r="5.1" style={{ fill: "#3a2a5a" }} />
        <path d="M1185 208l-5 -15" style={{ stroke: "#22395c", strokeWidth: 3.9, strokeLinecap: "round", fill: "none" }} /><path d="M1181.4 219.5q0-12 9.6-12q9.6 0 9.6 12z" style={{ fill: "#22395c" }} /><circle cx="1191" cy="202.1" r="5.3" style={{ fill: "#22395c" }} />
      </g>

      {/* LED barrier boards in front of the stands */}
      <g className="awaBoards">
        <rect x="196" y="262" width="808" height="22" rx="3" style={f("url(#awaBoard)", ink, 3)} />
        <rect x="0" y="240" width="230" height="16" rx="2" style={f("url(#awaBoard)", ink, 3)} />
        <rect x="970" y="240" width="230" height="16" rx="2" style={f("url(#awaBoard)", ink, 3)} />
        <rect className="awaBoardGlow" x="204" y="266" width="792" height="3" style={f("#ffb547")} />
        <text className="awaBoardText" x="600" y="280.5" textAnchor="middle">CLICKAWAY ★ PRECISION ARENA ★ SEASON 1 ★ CLICKAWAY</text>
        <rect x="8" y="245" width="214" height="3" style={f("#4fd8ff")} opacity=".7" />
        <rect x="978" y="245" width="214" height="3" style={f("#4fd8ff")} opacity=".7" />
      </g>

      {/* team banners hung from the roof */}
      <g className="awaBanners">
        {[
          [150, 96, "#2b8a5a", "#7dffb1"],
          [310, 74, "#2a6fb8", "#8fd4ff"],
          [850, 74, "#2a6fb8", "#8fd4ff"],
          [1010, 96, "#c98a24", "#fff1b0"],
        ].map(([x, y, body, trim]) => (
          <g key={x}>
            <rect x={x + 20} y={y - 24} width="4" height="24" style={f("#1c2c44")} />
            <path d={`M${x} ${y}h44v66l-22 -14l-22 14z`} style={f(body, ink, 2)} />
            <rect x={x} y={y} width="44" height="8" style={f(trim, ink, 2)} />
            <circle cx={x + 22} cy={y + 30} r="9" style={f(trim, ink, 2)} opacity=".85" />
          </g>
        ))}
      </g>

      {/* roof truss: steel chords with a painted web, columns to the stands */}
      <g className="awaRoof">
        <rect x="26" y="88" width="30" height="170" style={f("url(#awaSteel)", ink, 3)} />
        <rect x="1144" y="88" width="30" height="170" style={f("url(#awaSteel)", ink, 3)} />
        <path d="M30 92Q600 -24 1170 92v14Q600 -6 30 106Z" style={f("url(#awaSteel)", ink, 3)} />
        <path d="M30 136Q600 22 1170 136v12Q600 38 30 148Z" style={f("url(#awaSteel)", ink, 3)} />
        <path d={TRUSS} style={{ fill: "none", stroke: "#2c4566", strokeWidth: 5 }} />
        <path d="M30 92Q600 -24 1170 92" style={{ fill: "none", stroke: "#6d8db5", strokeWidth: 1.5 }} />
      </g>

      {/* scoreboard: cables, housing, lit screen, bulb trim */}
      <g className="awaBoard">
        <path d="M540 0v30M660 0v30" style={{ fill: "none", stroke: "#1c2c44", strokeWidth: 4 }} />
        <rect x="474" y="26" width="252" height="82" rx="8" style={f("#0b1424", ink, 4)} />
        <rect x="486" y="34" width="228" height="64" rx="4" style={f("url(#awaScreen)", "#2a4466", 2)} />
        <rect x="486" y="34" width="228" height="64" rx="4" style={f("url(#awaScan)")} />
        <text className="awaScreenIdle" x="600" y="74" textAnchor="middle">LIVE</text>
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} className="awaBulb" cx={490 + i * 20} cy="103" r="2.6" style={f(i % 2 ? "#ffd25c" : "#ff9a3c")} />
        ))}
        <rect x="448" y="40" width="22" height="50" rx="3" style={f("#14223a", ink, 3)} />
        <rect x="730" y="40" width="22" height="50" rx="3" style={f("#14223a", ink, 3)} />
      </g>

      {/* floodlight banks under the truss */}
      <g className="awaLights">
        {[250, 870].map((x) => (
          <g key={x}>
            <rect x={x} y="104" width="80" height="18" rx="3" style={f("#14223a", ink, 3)} />
            {[0, 1, 2, 3].map((i) => (
              <circle key={i} className="awaLamp" cx={x + 13 + i * 18} cy="113" r="5.5" style={f("#fff4d6")} />
            ))}
          </g>
        ))}
        <circle className="awaLamp" cx="41" cy="96" r="6" style={f("#fff4d6")} />
        <circle className="awaLamp" cx="1159" cy="96" r="6" style={f("#fff4d6")} />
      </g>
    </svg>
  )
}
