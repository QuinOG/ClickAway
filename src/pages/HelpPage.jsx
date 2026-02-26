const GETTING_STARTED_STEPS = [
  "Go to Game from the top navigation.",
  "Press Start Round and wait for the countdown.",
  "Hit the moving button as many times as possible before time runs out.",
  "Avoid clicking empty space in the arena to keep your streak alive.",
  "Use earned power-ups during the round for a score boost.",
]

const ROUND_FLOW_POINTS = [
  "Each round starts with a short countdown.",
  "The timer begins when gameplay starts and ends at 0.",
  "The button shrinks as you keep landing hits.",
  "A miss resets your streak and slows momentum.",
  "At the end of the round, you get a full performance summary.",
]

const CONTROLS_ROWS = [
  ["Hit Target", "Left click directly on the moving button."],
  ["Miss", "Left click inside the arena but not on the button."],
  ["Power-Up 1", "Press 1 when charges are available."],
  ["Power-Up 2", "Press 2 when charges are available."],
  ["Power-Up 3", "Press 3 when charges are available."],
]

const SCORING_ROWS = [
  ["Successful Hit", "Grants points based on base value and your combo multiplier."],
  ["Miss Click", "Subtracts base points and resets your streak to 0."],
  ["Combo Growth", "Multiplier increases as your streak grows."],
  ["Coins", "Coins are awarded from successful hits when the round ends."],
]

const POWERUP_ROWS = [
  ["1", "Time Boost", "Adds extra time to the round clock."],
  ["2", "Size Boost", "Makes the button larger so hits are easier."],
  ["3", "Bonus Points", "Instantly grants bonus score."],
]

const SHOP_POINTS = [
  "Spend coins to unlock new button skins and arena themes.",
  "Once an item is owned, you can equip it any time from the Shop page.",
  "Only one button skin and one arena theme can be active at once.",
  "Try different visual combinations to find what helps your focus most.",
]

const PERFORMANCE_TIPS = [
  "Prioritize accuracy first, then speed.",
  "Protect streaks because combo growth drives higher scores.",
  "Use size boost when the target gets tiny.",
  "Save time boost for late-round pressure moments.",
]

const FAQ_ITEMS = [
  {
    question: "Do cosmetics affect score?",
    answer: "No. Cosmetics are visual only.",
  },
  {
    question: "Can I lose coins?",
    answer: "Only when buying shop items.",
  },
  {
    question: "Can I switch equipped items anytime?",
    answer: "Yes, as long as you own them.",
  },
  {
    question: "What happens if I miss a lot?",
    answer: "Your streak keeps resetting and score growth slows down.",
  },
]

function HelpListSection({ title, items, ordered = false }) {
  const ListTag = ordered ? "ol" : "ul"

  return (
    <section className="helpBlock">
      <h2 className="cardH2">{title}</h2>
      <ListTag className="helpList">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </section>
  )
}

function HelpTableSection({ title, columns, rows, note }) {
  return (
    <section className="helpBlock">
      <h2 className="cardH2">{title}</h2>
      {note ? <p className="muted">{note}</p> : null}
      <table className="table helpTable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${title}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function HelpFaqSection() {
  return (
    <section className="helpBlock">
      <h2 className="cardH2">FAQ</h2>
      <ul className="helpList">
        {FAQ_ITEMS.map((item) => (
          <li key={item.question}>
            <strong>{item.question}</strong> {item.answer}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function HelpPage() {
  return (
    <div className="pageCenter">
      <section className="card helpDoc">
        <h1 className="cardTitle">Help Center</h1>
        <p className="muted helpIntro">
          Welcome to ClickAway. Use this guide to learn gameplay flow, scoring, power-ups,
          coins, cosmetics, and strategy.
        </p>

        <div className="helpGrid">
          <HelpListSection title="Getting Started" items={GETTING_STARTED_STEPS} ordered />
          <HelpListSection title="Round Flow" items={ROUND_FLOW_POINTS} />
        </div>

        <HelpTableSection title="Controls" columns={["Action", "Input"]} rows={CONTROLS_ROWS} />

        <HelpTableSection
          title="Scoring and Coins"
          columns={["Scoring Rule", "How It Works"]}
          rows={SCORING_ROWS}
        />

        <HelpTableSection
          title="Power-Ups"
          columns={["Key", "Power-Up", "Effect"]}
          rows={POWERUP_ROWS}
          note="Power-ups are awarded as you build streaks. Use them during active rounds for maximum value."
        />

        <div className="helpGrid">
          <HelpListSection title="Shop and Cosmetics" items={SHOP_POINTS} />
          <HelpListSection title="Performance Tips" items={PERFORMANCE_TIPS} />
        </div>

        <HelpFaqSection />
      </section>
    </div>
  )
}
