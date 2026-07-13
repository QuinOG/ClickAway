import { Link } from "react-router-dom"

import {
  ArrowDown,
  ClockCountdown,
  Coins,
  Crosshair,
  GameController,
  Lightning,
  Question,
  ShieldChevron,
  Target,
  Wrench,
} from "@phosphor-icons/react"

import { CommandHeader } from "../components/RouteScene.jsx"
import HelpFlowSection from "../features/help/components/HelpFlowSection.jsx"
import HelpFaqSection from "../features/help/components/HelpFaqSection.jsx"
import HelpListSection from "../features/help/components/HelpListSection.jsx"
import HelpQuickStartSection from "../features/help/components/HelpQuickStartSection.jsx"
import HelpRankTiersSection from "../features/help/components/HelpRankTiersSection.jsx"
import HelpTableSection from "../features/help/components/HelpTableSection.jsx"
import {
  ACCOUNT_ROWS,
  ARMORY_DEEP_LINKS,
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

const GUIDE_DESTINATIONS = Object.freeze([
  { id: "start", title: "First round", hint: "Ready → hit → reward", glyph: "play" },
  { id: "core", title: "Aim & powers", hint: "Score, combo, hotbar", glyph: "target" },
  { id: "modes", title: "Modes & rank", hint: "Pressure and stakes", glyph: "rank" },
  { id: "progression", title: "Rewards", hint: "XP, coins, cosmetics", glyph: "reward" },
  { id: "account", title: "Player record", hint: "Profile, history, ladder", glyph: "record" },
  { id: "faq", title: "Quick answers", hint: "Common field fixes", glyph: "question" },
])

function GuideGlyph({ glyph }) {
  switch (glyph) {
    case "play": return <GameController weight="duotone" />
    case "target": return <Crosshair weight="duotone" />
    case "rank": return <ShieldChevron weight="duotone" />
    case "reward": return <Coins weight="duotone" />
    case "record": return <ClockCountdown weight="duotone" />
    default: return <Question weight="duotone" />
  }
}

function HelpMissionMap() {
  return (
    <section className="helpMissionMap" aria-labelledby="help-mission-map-title">
      <div className="helpMissionMapHeader">
        <div>
          <p className="commandHeaderEyebrow">Choose a system</p>
          <h2 id="help-mission-map-title">Field guide</h2>
        </div>
        <span><i /> Training signal online</span>
      </div>
      <nav className="helpMissionGrid" aria-label="Field guide sections">
        {GUIDE_DESTINATIONS.map((item, index) => (
          <a key={item.id} className="helpMissionCard" href={`#${item.id}`}>
            <span className="helpMissionIndex">0{index + 1}</span>
            <span className="helpMissionGlyph" aria-hidden="true"><GuideGlyph glyph={item.glyph} /></span>
            <strong>{item.title}</strong>
            <small>{item.hint}</small>
            <ArrowDown weight="bold" aria-hidden="true" />
          </a>
        ))}
      </nav>
    </section>
  )
}

function RoundLoopDiagram() {
  return (
    <section className="helpRoundLoop" aria-labelledby="help-round-loop-title">
      <div className="helpRoundLoopCopy">
        <p className="commandHeaderEyebrow">One-glance briefing</p>
        <h2 id="help-round-loop-title">The round loop</h2>
        <p>Choose pressure, lock your build, then follow the target.</p>
        <Link className="helpRoundLoopAction" to="/game">
          Enter lobby <GameController weight="fill" aria-hidden="true" />
        </Link>
      </div>
      <ol className="helpRoundLoopTrack">
        <li data-step="ready"><span><Wrench weight="duotone" /></span><strong>Ready</strong><small>Mode + build</small></li>
        <li data-step="count"><span><ClockCountdown weight="duotone" /></span><strong>3 · 2 · 1</strong><small>Eyes center</small></li>
        <li data-step="hit"><span><Target weight="duotone" /></span><strong>Hit</strong><small>Chain streak</small></li>
        <li data-step="reward"><span><Lightning weight="duotone" /></span><strong>Reward</strong><small>XP + rank</small></li>
      </ol>
    </section>
  )
}

export default function HelpPage() {
  return (
    <div className="pageCenter helpPageScene">
      <section className="card helpDoc">
        <CommandHeader
          routeId="help"
          eyebrow="Arena field manual"
          title="Learn by sight"
          subtitle="Pick a system, see its shape, then open the exact rules only when you need them."
          status={<span className="helpGuideStatus"><Target weight="bold" /> 6 systems</span>}
        />

        <HelpMissionMap />
        <RoundLoopDiagram />

        <nav className="helpQuickNav helpQuickNavCompact" aria-label="Quick help navigation">
          <span className="helpQuickNavLabel">Exact reference</span>
          <div className="helpQuickNavLinks">
            {HELP_QUICK_NAV.map((item) => (
              <a key={item.id} className="helpQuickNavLink" href={`#${item.id}`}>{item.label}</a>
            ))}
          </div>
        </nav>

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
            <HelpListSection title="History and Ladder" items={TRACKING_POINTS} />
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
