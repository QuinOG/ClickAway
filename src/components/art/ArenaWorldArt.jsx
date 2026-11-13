import "./arena-world-art.css"

// Keep the painted structure separate from animated light and theme tint.
export default function ArenaWorldArt({ className = "" }) {
  return (
    <span
      className={`arenaWorldArt ${className}`.trim()}
      aria-hidden="true"
    >
      <img className="arenaWorldPlate" src="/art/arena/stadium.webp" alt="" draggable="false" />
      <span className="arenaWorldLighting" aria-hidden="true">
        <span className="awaLamp awaBulb" />
        <span className="awaLamp awaBulb" />
        <span className="awaLamp awaBulb" />
      </span>
    </span>
  )
}
