import HelpFlowSection from "../features/help/components/HelpFlowSection.jsx"
import HelpFaqSection from "../features/help/components/HelpFaqSection.jsx"
import HelpListSection from "../features/help/components/HelpListSection.jsx"
import HelpQuickStartSection from "../features/help/components/HelpQuickStartSection.jsx"
import HelpRankTiersSection from "../features/help/components/HelpRankTiersSection.jsx"
import HelpTableSection from "../features/help/components/HelpTableSection.jsx"
import {
  ACCOUNT_ROWS,
  CONTROLS_ROWS,
  DATA_SYSTEM_POINTS,
  DIFFICULTY_ROWS,
  FAQ_ITEMS,
  HELP_QUICK_NAV,
  LOADOUT_POINTS,
  MODE_EXPLANATION_POINTS,
  MODE_TUNING_ROWS,
  NAVIGATION_ROWS,
  PERFORMANCE_TIPS,
  POWERUP_ROWS,
  POWERUP_RULES_POINTS,
  PROFILE_POINTS,
  PROGRESSION_POINTS,
  QUICKSTART_CARDS,
  RANK_RULES_POINTS,
  RANK_TIER_ROWS,
  ROUND_FLOW_STEPS,
  SCORING_ROWS,
  SHOP_POINTS,
  TRACKING_POINTS,
} from "../features/help/helpPageStructuredContent.js"

export default function HelpPage() {
  return (
    <div className="pageCenter">
      <section className="card helpDoc">
        <div className="helpHero">
          <h1 className="helpHeroTitle">Help Center</h1>
          <p className="helpHeroCopy">
            Learn the first round fast, then dip into deeper systems only when you need them.
          </p>
          <nav className="helpQuickNav" aria-label="Quick help navigation">
            <span className="helpQuickNavLabel">Jump To</span>
            <div className="helpQuickNavLinks">
              {HELP_QUICK_NAV.map((item) => (
                <a key={item.id} className="helpQuickNavLink" href={`#${item.id}`}>
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        </div>

        <section id="start" className="helpTopicGroup" aria-label="Start here">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">First Round</h2>
          </div>
          <HelpQuickStartSection cards={QUICKSTART_CARDS} />
          <HelpFlowSection title="Round Flow" steps={ROUND_FLOW_STEPS} />
        </section>

        <section id="core" className="helpTopicGroup" aria-label="Core gameplay systems">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">Core Gameplay</h2>
          </div>
          <div className="helpGrid">
            <HelpTableSection title="Controls" columns={["Action", "Input"]} rows={CONTROLS_ROWS} />
            <HelpListSection title="Buildcraft Loadouts" items={LOADOUT_POINTS} />
          </div>

          <HelpTableSection
            title="Scoring and Combo"
            columns={["Scoring Rule", "How It Works"]}
            rows={SCORING_ROWS}
          />

          <div className="helpGrid">
            <HelpTableSection
              title="Power-Ups"
              columns={["Power-Up", "Unlock", "Charge Rate", "Effect"]}
              rows={POWERUP_ROWS}
              note="Power-ups only work during live rounds and require charges."
            />
            <HelpListSection title="Power-Up Rules" items={POWERUP_RULES_POINTS} />
          </div>
        </section>

        <section id="modes" className="helpTopicGroup" aria-label="Modes and ranked rules">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">Modes and Ranked</h2>
          </div>
          <div className="helpGrid">
            <HelpListSection title="Modes Explained" items={MODE_EXPLANATION_POINTS} />
            <HelpTableSection
              title="Mode Rules"
              columns={["Mode", "Timer", "Miss Penalty", "Coin Rate", "XP", "Rank"]}
              rows={DIFFICULTY_ROWS}
            />
          </div>
          <div className="helpGrid">
            <HelpRankTiersSection tiers={RANK_TIER_ROWS} />
            <HelpListSection title="Rank and Rating Rules" items={RANK_RULES_POINTS} />
          </div>
          <HelpTableSection
            title="Mode Tuning"
            columns={["Mode", "Initial Size", "Min Size", "Shrink Factor", "Combo Step", "Max Time Buffer"]}
            rows={MODE_TUNING_ROWS}
            note="Advanced reference: these values explain why each mode feels different once you already know the basics."
          />
        </section>

        <section id="progression" className="helpTopicGroup" aria-label="Progression and economy">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">Progression and Economy</h2>
          </div>
          <div className="helpGrid">
            <HelpListSection title="Progression Math" items={PROGRESSION_POINTS} />
            <HelpListSection title="Shop and Cosmetics" items={SHOP_POINTS} />
          </div>
          <div className="helpGrid">
            <HelpListSection title="Performance Tips" items={PERFORMANCE_TIPS} />
            <HelpListSection title="Data and Storage" items={DATA_SYSTEM_POINTS} />
          </div>
        </section>

        <section id="account" className="helpTopicGroup" aria-label="Account, tracking, and navigation">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">Account, Tracking, and Navigation</h2>
          </div>
          <div className="helpGrid">
            <HelpTableSection
              title="Account Access"
              columns={["Task", "How It Works"]}
              rows={ACCOUNT_ROWS}
            />
            <HelpTableSection
              title="Navigation"
              columns={["Page", "What You Use It For"]}
              rows={NAVIGATION_ROWS}
            />
          </div>
          <div className="helpGrid">
            <HelpListSection title="Profile and Achievements" items={PROFILE_POINTS} />
            <HelpListSection title="History and Leaderboard" items={TRACKING_POINTS} />
          </div>
        </section>

        <section id="faq" className="helpTopicGroup" aria-label="Frequently asked questions">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">FAQ</h2>
          </div>
          <HelpFaqSection faqItems={FAQ_ITEMS} showTitle={false} />
        </section>
      </section>
    </div>
  )
}
