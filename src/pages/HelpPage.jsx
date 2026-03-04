import HelpFaqSection from "../features/help/components/HelpFaqSection.jsx"
import HelpListSection from "../features/help/components/HelpListSection.jsx"
import HelpTableSection from "../features/help/components/HelpTableSection.jsx"
import {
  CONTROLS_ROWS,
  DIFFICULTY_ROWS,
  FAQ_ITEMS,
  GETTING_STARTED_STEPS,
  NAVIGATION_ROWS,
  PERFORMANCE_TIPS,
  POWERUP_ROWS,
  PROGRESSION_POINTS,
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
          New here? Start with this quick guide.
        </p>

        <div className="helpGrid">
          <HelpListSection title="Quick Start" items={GETTING_STARTED_STEPS} ordered />
          <HelpListSection title="Round Flow" items={ROUND_FLOW_POINTS} />
        </div>

        <HelpTableSection
          title="Navigation"
          columns={["Page", "What You Use It For"]}
          rows={NAVIGATION_ROWS}
        />

        <HelpTableSection title="Controls" columns={["Action", "Input"]} rows={CONTROLS_ROWS} />

        <HelpTableSection
          title="Difficulty"
          columns={["Mode", "Timer", "Miss Penalty", "Coin Rate", "Coins", "Level", "Rank"]}
          rows={DIFFICULTY_ROWS}
        />

        <HelpTableSection
          title="Scoring"
          columns={["Scoring Rule", "How It Works"]}
          rows={SCORING_ROWS}
        />

        <HelpTableSection
          title="Power-Ups"
          columns={["Key", "Power-Up", "How You Earn It", "Effect"]}
          rows={POWERUP_ROWS}
          note="Power-ups only work during live rounds and require charges."
        />

        <div className="helpGrid">
          <HelpListSection title="Shop and Cosmetics" items={SHOP_POINTS} />
          <HelpListSection title="Performance Tips" items={PERFORMANCE_TIPS} />
        </div>

        <HelpListSection title="Progress" items={PROGRESSION_POINTS} />

        <HelpFaqSection faqItems={FAQ_ITEMS} />
      </section>
    </div>
  )
}
