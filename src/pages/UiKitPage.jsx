import { useState } from "react"
import { Crosshair, Info, WarningCircle } from "@phosphor-icons/react"
import "../styles/components/ui-kit.css"

import TierBadge from "../components/TierBadge.jsx"
import {
  ActionButton,
  ActionLink,
  Badge,
  CommandStrip,
  EmptyScene,
  ErrorScene,
  InsetDetail,
  MobileSheet,
  Modal,
  Popover,
  ProgressMeter,
  Scene,
  SegmentedControl,
  Skeleton,
  SkeletonGroup,
  Stage,
  StatReadout,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Tooltip,
} from "../components/ui/index.js"

const BADGE_STATES = [
  "neutral",
  "info",
  "success",
  "warning",
  "error",
  "owned",
  "equipped",
  "affordable",
  "unaffordable",
  "locked",
]

const RANK_LABELS = [
  "Unranked",
  "Placement 0/5",
  "Placement 4/5",
  "Bronze I",
  "Silver II",
  "Gold III",
  "Platinum I",
  "Diamond III",
  "Deadeye",
]

const ACTION_STATES = [
  { label: "Default", status: "idle" },
  { label: "Success", status: "success" },
  { label: "Warning", status: "warning" },
  { label: "Error", status: "error" },
  { label: "Owned", status: "owned" },
  { label: "Equipped", status: "equipped" },
  { label: "Affordable", status: "affordable" },
  { label: "Unaffordable", status: "unaffordable" },
]

const TYPE_SAMPLES = [
  { token: "caption", label: "Caption", copy: "ROUND TELEMETRY" },
  { token: "label", label: "Label", copy: "Selected loadout" },
  { token: "body-sm", label: "Small body", copy: "Precision cues stay readable at compact sizes." },
  { token: "body", label: "Body", copy: "Interface copy uses the local Sora variable family." },
  { token: "title-sm", label: "Small title", copy: "Calibration ready" },
  { token: "title", label: "Title", copy: "Enter the arena" },
  { token: "display", label: "Display", copy: "CLEAN HIT" },
  { token: "score", label: "Score", copy: "12,480" },
]

const MODE_SAMPLES = [
  { mode: "practice", label: "Practice", cue: "Open calibration ring" },
  { mode: "casual", label: "Casual", cue: "Offset impact rings" },
  { mode: "ranked", label: "Ranked", cue: "Forward competition crest" },
  { mode: "pressure", label: "Pressure", cue: "Inward ticks · Low time" },
]

const ARENA_THEMES = ["default", "sunset", "forest", "arcade"]

export default function UiKitPage() {
  const [activeTab, setActiveTab] = useState("actions")
  const [mode, setMode] = useState("practice")
  const [modalOpen, setModalOpen] = useState(false)
  const [dangerModalOpen, setDangerModalOpen] = useState(false)
  const [responsiveModalOpen, setResponsiveModalOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)

  function simulateRetry() {
    setRetrying(true)
    window.setTimeout(() => setRetrying(false), 700)
  }

  return (
    <Stage className="uiKitStage" size="full" mode={mode}>
      <Scene
        eyebrow="Development reference"
        title="Precision Arena foundation"
        headingLevel={1}
        description="A non-production fixture for the shared visual tokens, interaction states, and purpose-based primitives."
        commands={(
          <Tooltip content="This route is only compiled in development.">
            <button type="button" className="uiKitInfoButton" aria-label="About this reference route">
              <Info size={19} />
            </button>
          </Tooltip>
        )}
      >
        <SegmentedControl
          legend="Preview mode lighting"
          name="ui-kit-mode"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "practice", label: "Practice" },
            { value: "casual", label: "Casual" },
            { value: "ranked", label: "Ranked" },
          ]}
        />

        <section className="uiKitFoundationSection" aria-labelledby="ui-kit-type-title">
          <div className="uiKitSectionHeading">
            <span className="uiKitLabel">Typography</span>
            <h2 id="ui-kit-type-title">Local type scale</h2>
            <p>Display type is reserved for titles and competitive numbers; composed Sora carries interface copy.</p>
          </div>
          <div className="uiKitTypeScale">
            {TYPE_SAMPLES.map((sample) => (
              <div className="uiKitTypeSample" data-token={sample.token} key={sample.token}>
                <span>{sample.label}</span>
                <strong>{sample.copy}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="uiKitFoundationSection" aria-labelledby="ui-kit-mode-title">
          <div className="uiKitSectionHeading">
            <span className="uiKitLabel">Mode language</span>
            <h2 id="ui-kit-mode-title">Color always has a named shape cue</h2>
          </div>
          <div className="uiKitModeGrid">
            {MODE_SAMPLES.map((sample) => (
              <div className="uiKitModeSample" data-mode={sample.mode} key={sample.mode}>
                <span className="uiKitModeGlyph" aria-hidden="true" />
                <strong>{sample.label}</strong>
                <span>{sample.cue}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="uiKitFoundationSection" aria-labelledby="ui-kit-brand-title">
          <div className="uiKitSectionHeading">
            <span className="uiKitLabel">Pointer / impact system</span>
            <h2 id="ui-kit-brand-title">Brand marks, impact sizes, and target boundary</h2>
          </div>
          <div className="uiKitBrandReference">
            <div className="uiKitBrandMarks" aria-label="Authored ClickAway brand marks">
              <img src="/brand/clickaway-mark.svg" alt="ClickAway pointer and impact mark" />
              <img src="/brand/clickaway-favicon.svg" alt="Compact ClickAway impact mark" />
            </div>
            <div className="uiKitImpactSizes" aria-label="Small, medium, and large impact motifs">
              {["sm", "md", "lg"].map((size) => (
                <span className="uiKitImpact" data-size={size} key={size}>
                  <span className="uiVisuallyHidden">{size} impact motif</span>
                </span>
              ))}
            </div>
          </div>
          <div className="uiKitArenaThemeGrid" aria-label="Target contrast across legacy arena themes">
            {ARENA_THEMES.map((theme) => (
              <div className={`uiKitArenaTheme theme-${theme}`} key={theme}>
                <span>{theme}</span>
                <span className="uiKitTarget" aria-label={`Target boundary on ${theme} arena`}>
                  <Crosshair size={24} weight="bold" aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="uiKitDepthGrid" aria-label="Depth and target contrast reference">
          {[0, 1, 2].map((depth) => (
            <div className="uiKitDepth" data-depth={depth} key={depth}>
              <span>Depth {depth}</span>
              <div className="uiKitTarget" aria-label="Target contrast sample">
                <Crosshair size={24} weight="bold" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabList aria-label="Foundation reference sections">
            <Tab value="actions">Actions</Tab>
            <Tab value="status">Status</Tab>
            <Tab value="resilience">Resilience</Tab>
          </TabList>

          <TabPanel value="actions">
            <InsetDetail title="Action hierarchy" tone="info">
              <CommandStrip
                aria-label="Example commands"
                align="split"
                primary={<ActionButton intent="primary">Enter arena</ActionButton>}
                secondary={(
                  <>
                    <ActionButton intent="secondary">Review build</ActionButton>
                    <ActionButton intent="quiet">Details</ActionButton>
                  </>
                )}
                contextual={<ActionButton intent="danger">Abandon</ActionButton>}
              />
              <p className="uiKitReferenceNote">Hover, focus, and press these controls to inspect their interactive states.</p>
              <div className="uiKitStateRow">
                {ACTION_STATES.map((actionState) => (
                  <ActionButton status={actionState.status} key={actionState.status}>
                    {actionState.label}
                  </ActionButton>
                ))}
                <ActionButton disabled>Disabled</ActionButton>
                <ActionButton isLocked lockedReason="Reach level 5">Locked</ActionButton>
                <ActionButton isLoading loadingLabel="Calibrating...">Loading</ActionButton>
                <ActionButton isSelected>Selected</ActionButton>
                <ActionLink href="#ui-kit-type-title" intent="secondary">Action link</ActionLink>
              </div>
            </InsetDetail>

            <div className="uiKitDisclosureRow">
              <Popover
                title="Calibration note"
                description="Popover content may be interactive and closes with Escape."
                content={<ActionButton size="sm">Acknowledge</ActionButton>}
              >
                <ActionButton intent="secondary">Open popover</ActionButton>
              </Popover>
              <ActionButton onClick={() => setModalOpen(true)}>Open modal</ActionButton>
              <ActionButton intent="danger" onClick={() => setDangerModalOpen(true)}>Danger modal</ActionButton>
              <ActionButton onClick={() => setResponsiveModalOpen(true)}>Responsive modal</ActionButton>
              <ActionButton onClick={() => setSheetOpen(true)}>Open sheet</ActionButton>
            </div>
          </TabPanel>

          <TabPanel value="status">
            <div className="uiKitBadgeGrid">
              {BADGE_STATES.map((status) => (
                <Badge status={status} key={status}>{status}</Badge>
              ))}
              {MODE_SAMPLES.slice(0, 3).map(({ mode: badgeMode, label }) => (
                <Badge mode={badgeMode} key={`mode-${badgeMode}`}>{label}</Badge>
              ))}
            </div>
            <div className="uiKitRankGrid">
              {RANK_LABELS.map((rankLabel) => (
                <TierBadge tierLabel={rankLabel} key={rankLabel} />
              ))}
            </div>
            <div className="uiKitStats">
              <StatReadout label="Accuracy" value="96.4%" detail="Personal best" tone="positive" emphasis="hero" />
              <StatReadout label="Reaction" value="184 ms" detail="Last 10 hits" />
              <StatReadout label="RR" value="+18" detail="Projected" tone="warning" />
            </div>
            <ProgressMeter label="Level progress" value={68} valueText="680 / 1,000 XP" tone="success" />
            <ProgressMeter label="Loading placement data" isIndeterminate />

            <InsetDetail title="Vertical and disabled tab reference">
              <Tabs defaultValue="overview" orientation="vertical" className="uiKitVerticalTabs">
                <TabList aria-label="Vertical tab example">
                  <Tab value="overview">Overview</Tab>
                  <Tab value="records">Records</Tab>
                  <Tab value="locked" disabled>Season locked</Tab>
                </TabList>
                <TabPanel value="overview">Arrow Down moves to Records and activates it.</TabPanel>
                <TabPanel value="records">Arrow Up returns to Overview; Home and End wrap enabled tabs.</TabPanel>
                <TabPanel value="locked">Disabled panels cannot be selected.</TabPanel>
              </Tabs>
            </InsetDetail>
          </TabPanel>

          <TabPanel value="resilience">
            <div className="uiKitStateScenes">
              <EmptyScene
                title="No rounds logged"
                description="Your performance journal appears after the first completed round."
                action={<ActionButton intent="primary">Play a round</ActionButton>}
              />
              <ErrorScene
                icon={<WarningCircle size={28} />}
                title="Arena data did not load"
                description="Your progress is safe. Try the request again."
                onRetry={simulateRetry}
                isRetrying={retrying}
              />
            </div>
            <SkeletonGroup className="uiKitSkeletons" label="Loading player identity">
              <Skeleton shape="circle" width="48px" height="48px" />
              <div>
                <Skeleton width="180px" height="14px" />
                <Skeleton width="120px" height="11px" />
              </div>
            </SkeletonGroup>
          </TabPanel>
        </Tabs>
      </Scene>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Round confirmation"
        description="Modal focus is trapped and restored to the invoking control."
        footer={<ActionButton onClick={() => setModalOpen(false)}>Confirm</ActionButton>}
      >
        <p className="uiKitDialogCopy">This proving surface uses the same dialog contract as settings and future result moments.</p>
      </Modal>

      <Modal
        open={dangerModalOpen}
        onOpenChange={setDangerModalOpen}
        title="Abandon this run?"
        description="Danger dialogs initially focus the close control, never the destructive action."
        tone="danger"
        dismissOnBackdrop={false}
        footer={(
          <>
            <ActionButton intent="secondary" onClick={() => setDangerModalOpen(false)}>Keep playing</ActionButton>
            <ActionButton intent="danger" onClick={() => setDangerModalOpen(false)}>Abandon run</ActionButton>
          </>
        )}
      >
        <p className="uiKitDialogCopy">Backdrop dismissal is disabled because this choice is costly.</p>
      </Modal>

      <Modal
        open={responsiveModalOpen}
        onOpenChange={setResponsiveModalOpen}
        title="Responsive review"
        description="This modal uses sheet presentation at the mobile breakpoint."
        mobilePresentation="sheet"
        footer={<ActionButton onClick={() => setResponsiveModalOpen(false)}>Done</ActionButton>}
      >
        <p className="uiKitDialogCopy">The semantic dialog contract remains unchanged when its mobile presentation changes.</p>
      </Modal>

      <MobileSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Mobile command sheet"
        description="The same focus, Escape, backdrop, and restoration behavior applies here."
      >
        <CommandStrip
          primary={<ActionButton onClick={() => setSheetOpen(false)}>Done</ActionButton>}
          secondary={<ActionButton intent="secondary">Secondary action</ActionButton>}
        />
      </MobileSheet>
    </Stage>
  )
}
