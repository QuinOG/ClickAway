import HelpFaqSection from "../features/help/components/HelpFaqSection.jsx"
import HelpListSection from "../features/help/components/HelpListSection.jsx"
import HelpTableSection from "../features/help/components/HelpTableSection.jsx"
import {
  CONTROLS_ROWS,
  FAQ_ITEMS,
  GETTING_STARTED_STEPS,
  PERFORMANCE_TIPS,
  POWERUP_ROWS,
  ROUND_FLOW_POINTS,
  SCORING_ROWS,
  SHOP_POINTS,
} from "../features/help/helpContent.js"

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

        <HelpFaqSection faqItems={FAQ_ITEMS} />
      </section>
    </div>
  )
}
