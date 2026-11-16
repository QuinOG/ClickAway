import "../features/help/help-rulebook.css"
import { Link } from "react-router-dom"

import { CommandHeader } from "../components/RouteScene.jsx"
import HelpFlowSection from "../features/help/components/HelpFlowSection.jsx"
import HelpFaqSection from "../features/help/components/HelpFaqSection.jsx"
import HelpListSection from "../features/help/components/HelpListSection.jsx"
import HelpQuickStartSection from "../features/help/components/HelpQuickStartSection.jsx"
import HelpRankTiersSection from "../features/help/components/HelpRankTiersSection.jsx"
import HelpTableSection from "../features/help/components/HelpTableSection.jsx"
import { HelpAccountCards, HelpModeCards, HelpPowerupCards, HelpProgressionCards, HelpRoundStrip, HelpRuleCards } from "../features/help/components/HelpVisualGuide.jsx"
import {
  ACCOUNT_ROWS,
  ARMORY_DEEP_LINKS,
  CONTROLS_ROWS,
  DATA_SYSTEM_POINTS,
  DIFFICULTY_ROWS,
  FAQ_ITEMS,
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

function Rulebook({ label, children }) {
  return (
    <details className="helpRulebook">
      <summary>{label ? `${label} rules` : "Full rulebook"}</summary>
      <div className="helpRulebookBody">{children}</div>
    </details>
  )
}

export default function HelpPage() {
  return (
    <div className="pageCenter helpPageScene">
      <section className="card helpDoc">
        <CommandHeader
          routeId="help"
          eyebrow="Arena field manual"
          title="Field Guide"
          subtitle="Pick a system, see its shape, then open the exact rules only when you need them."
        />

        <section id="start" className="helpTopicGroup" aria-label="Start here">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">First Round</h2>
          </div>
          <HelpRoundStrip />
          <Rulebook label="Round flow">
            <HelpQuickStartSection cards={QUICKSTART_CARDS} />
            <HelpFlowSection title="Round Flow" steps={ROUND_FLOW_STEPS} />
          </Rulebook>
        </section>

        <section id="core" className="helpTopicGroup" aria-label="Core gameplay systems">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">Core Gameplay</h2>
          </div>
          <HelpRuleCards />
          <h3 className="helpSubhead">Power keys 1 · 2 · 3</h3>
          <HelpPowerupCards />
          <Rulebook label="Gameplay">
          <div className="helpGrid">
              <HelpTableSection title="Controls" columns={["Action", "Input"]} rows={CONTROLS_ROWS} />
              <div>
                <HelpListSection title="Buildcraft Loadouts" items={LOADOUT_POINTS} />
                <nav className="helpArmoryLinks" aria-label="Jump to Armory">
                  {ARMORY_DEEP_LINKS.map((link) => (
                    <Link key={link.to} className="helpArmoryLink" to={link.to}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
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
          </Rulebook>
        </section>

        <section id="modes" className="helpTopicGroup" aria-label="Modes and ranked rules">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">Modes and Ranked</h2>
          </div>
          <HelpModeCards />
          <HelpRankTiersSection tiers={RANK_TIER_ROWS} />
          <Rulebook label="Mode and rank">
          <div className="helpGrid">
              <HelpListSection title="Modes Explained" items={MODE_EXPLANATION_POINTS} />
              <HelpTableSection
                title="Mode Rules"
                columns={["Mode", "Timer", "Miss Penalty", "Coin Rate", "XP", "Rank"]}
                note="Base rules before passive parts and active powers modify gameplay."
                rows={DIFFICULTY_ROWS}
              />
            </div>
            <div className="helpGrid">
              <HelpListSection title="Rank and Rating Rules" items={RANK_RULES_POINTS} />
            </div>
            <HelpTableSection
              title="Mode Tuning"
              columns={["Mode", "Initial Size", "Min Size", "Shrink Factor", "Combo Step", "Max Time Buffer"]}
              rows={MODE_TUNING_ROWS}
              note="Advanced reference: these values explain why each mode feels different once you already know the basics."
            />
          </Rulebook>
        </section>

        <section id="progression" className="helpTopicGroup" aria-label="Progression and economy">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">Progression and Economy</h2>
          </div>
          <HelpProgressionCards />
          <Rulebook label="Progression">
          <div className="helpGrid">
              <HelpListSection title="Progression Math" items={PROGRESSION_POINTS} />
              <HelpListSection title="Shop and Cosmetics" items={SHOP_POINTS} />
            </div>
            <div className="helpGrid">
              <HelpListSection title="Performance Tips" items={PERFORMANCE_TIPS} />
              <HelpListSection title="Data and Storage" items={DATA_SYSTEM_POINTS} />
            </div>
          </Rulebook>
        </section>

        <section id="account" className="helpTopicGroup" aria-label="Account, tracking, and navigation">
          <div className="helpGroupHeader">
            <h2 className="helpGroupTitle">Account, Tracking, and Navigation</h2>
          </div>
          <HelpAccountCards />
          <Rulebook label="Account and tracking">
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
              <HelpListSection title="History and Ladder" items={TRACKING_POINTS} />
            </div>
          </Rulebook>
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
