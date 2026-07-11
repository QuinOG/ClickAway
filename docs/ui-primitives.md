# ClickAway purpose-based UI primitives

The primitive kit gives routes a shared interaction and hierarchy language without creating another generic card library. A scene is borderless by default. Use `InsetDetail` only when information is genuinely secondary, and use one primary action in each `CommandStrip`.

## Setup

Import the stylesheet once after tokens and base styles, before page-specific overrides:

```css
@import "./components/ui-primitives.css";
```

Import components from the single public entry point:

```jsx
import {
  ActionButton,
  CommandStrip,
  Scene,
  Stage,
} from "../components/ui/index.js"
```

The CSS reads semantic tokens first and retains safe fallbacks to the legacy token names. Consumers select semantic `intent`, `status`, `tone`, and `mode` values; they do not pass colors.

## Composition and hierarchy

### Stage and Scene

`Stage` owns page width and a restrained mode atmosphere. `Scene` creates a labelled content region and heading hierarchy without adding a panel around it.

```jsx
<Stage size="wide" mode="ranked">
  <Scene
    eyebrow="Ranked queue"
    title="Precision trial"
    headingLevel={1}
    description="One round. Rating is on the line."
    commands={
      <CommandStrip
        aria-label="Round commands"
        primary={<ActionButton intent="primary">Ready</ActionButton>}
        secondary={<ActionButton intent="quiet">Review build</ActionButton>}
      />
    }
  >
    {/* Major content breathes here without a surrounding card. */}
  </Scene>
</Stage>
```

- `Stage size`: `focused`, `wide`, or `full`.
- `Stage mode`: `neutral`, `practice`, `casual`, or `ranked`.
- `Scene headingLevel`: 1 through 6. The generated heading id labels the region.
- `CommandStrip primary` is a single slot. `secondary` and `contextual` may hold grouped supporting controls. `align="split"` moves contextual content to the far edge on wider screens.

### InsetDetail and StatReadout

```jsx
<InsetDetail title="Rating protection" tone="warning">
  Your next loss cannot drop this division.
</InsetDetail>

<StatReadout
  label="Session rating"
  value="+28 RR"
  detail="Across three rounds"
  tone="positive"
  emphasis="strong"
/>
```

`InsetDetail tone` accepts `neutral`, `info`, `success`, `warning`, or `danger`. `StatReadout tone` accepts `neutral`, `positive`, `negative`, or `warning`; `emphasis="strong"` is reserved for a scene's dominant score.

## Actions

`ActionButton` always renders a native button and defaults to `type="button"`. `ActionLink` renders a React Router `Link` when given `to`, or a native anchor when given `href`. Do not turn navigation into a button or a mutation into a link merely for styling.

```jsx
<ActionButton
  intent="primary"
  size="lg"
  isLoading={isSaving}
  loadingLabel="Saving build…"
  onClick={saveBuild}
>
  Save build
</ActionButton>

<ActionLink to="/history" intent="secondary">
  View history
</ActionLink>
```

- `intent`: `primary`, `secondary`, `quiet`, or `danger`.
- `size`: `sm`, `md`, or `lg`; every size retains at least a 44 px target.
- `status`: `idle`, `success`, `warning`, `error`, `owned`, `equipped`, `affordable`, or `unaffordable`.
- `isSelected` exposes `aria-pressed` on a button and `aria-current="page"` on a link.
- `isLocked`, `disabled`, and `isLoading` disable a button. Supply `lockedReason` with `isLocked`; the primitive adds a lock glyph and exposes that reason to assistive technology. `isDisabled` or `isLoading` leaves an action link discoverable with `aria-disabled` but prevents activation.
- Destructive and irreversible actions must use `intent="danger"` and explicit copy. The primitive does not silently add confirmation; use a danger `Modal` when confirmation is required.

Use only one `intent="primary"` action per command group.

## Tabs and segmented choices

Tabs change between associated panels. A segmented control chooses a value. Filters that do not reveal discrete tab panels should normally be segmented controls, not ARIA tabs.

```jsx
<Tabs value={view} onValueChange={setView} orientation="horizontal">
  <TabList aria-label="Profile views">
    <Tab value="overview">Overview</Tab>
    <Tab value="records">Records</Tab>
    <Tab value="season" disabled>Season locked</Tab>
  </TabList>
  <TabPanel value="overview">...</TabPanel>
  <TabPanel value="records">...</TabPanel>
  <TabPanel value="season">...</TabPanel>
</Tabs>
```

`Tabs` may instead use `defaultValue` when uncontrolled. Always provide an initial value matching an enabled tab. The default `activationMode="automatic"` selects as focus moves. Horizontal tabs support Left/Right, vertical tabs support Up/Down, and both support Home/End, wrapping, and disabled-tab skipping. Each tab and panel receives stable `aria-controls` and `aria-labelledby` relationships, with one roving tab stop.

```jsx
<SegmentedControl
  legend="Leaderboard range"
  name="ladder-range"
  value={range}
  onValueChange={setRange}
  options={[
    { value: "top", label: "Top players" },
    { value: "nearby", label: "Around me" },
  ]}
/>
```

`SegmentedControl` uses native same-name radios, preserving browser and assistive-technology keyboard behavior. Set `hideLegend` only when the legend would duplicate nearby visible text.

## Status and progress

```jsx
<Badge status="equipped">Equipped</Badge>
<Badge status="locked">Level 12</Badge>
<Badge mode="ranked">Ranked</Badge>

<ProgressMeter
  label="Gold II progress"
  value={72}
  max={100}
  valueText="72 RR of 100 RR"
  tone="ranked"
/>
```

`Badge status` accepts `neutral`, `info`, `success`, `warning`, `error`, `owned`, `equipped`, `affordable`, `unaffordable`, or `locked`. A badge always includes text; an icon may reinforce but never replace its meaning. `mode` accepts `practice`, `casual`, or `ranked`.

`ProgressMeter` is backed by native `<progress>`. Omit a meaningful value and set `isIndeterminate` for unknown work. `valueText` should include the domain unit when a percentage alone is ambiguous.

## Tooltip and Popover

A tooltip contains nonessential descriptive text only. It opens on hover and keyboard focus, links itself to the actual trigger with `aria-describedby`, and closes on blur, pointer leave, or Escape.

```jsx
<Tooltip content="RR gained during this session">
  <button type="button" aria-label="About session rating">?</button>
</Tooltip>
```

The child must be one ref-capable focusable element. Never put buttons, links, required instructions, or error recovery inside a tooltip.

A popover is a nonmodal disclosure for richer or interactive supporting content:

```jsx
<Popover
  title="Player summary"
  description="Current competitive snapshot"
  placement="bottom-end"
  content={<ActionLink to="/profile">Open profile</ActionLink>}
>
  <button type="button">Player</button>
</Popover>
```

The trigger receives `aria-expanded`, `aria-controls`, and `aria-haspopup="dialog"`. Escape and outside pointer presses dismiss it. Focus stays on the disclosure by default; pass `initialFocusRef` only when moving focus into the popover is useful. If the focused popover closes, focus returns to its trigger. Use `Modal`, not `Popover`, for a blocking decision.

## Modal and MobileSheet

`Modal` and `MobileSheet` share the same focus, Escape, backdrop, scroll-lock, background-inerting, and focus-restoration implementation. A modal does not become a sheet automatically. Choose `MobileSheet` when the task benefits from bottom-edge context, or opt a modal into a responsive sheet with `mobilePresentation="sheet"`.

```jsx
const triggerRef = useRef(null)
const cancelRef = useRef(null)

<ActionButton ref={triggerRef} intent="danger" onClick={() => setOpen(true)}>
  Delete replay
</ActionButton>

<Modal
  open={open}
  onOpenChange={setOpen}
  title="Delete this replay?"
  description="This cannot be undone."
  tone="danger"
  triggerRef={triggerRef}
  initialFocusRef={cancelRef}
  footer={
    <>
      <ActionButton ref={cancelRef} onClick={() => setOpen(false)}>Cancel</ActionButton>
      <ActionButton intent="danger" onClick={deleteReplay}>Delete replay</ActionButton>
    </>
  }
>
  The saved result and ghost data will be removed.
</Modal>
```

Required behavior:

- `title` labels the dialog. If there is intentionally no visible title, supply `aria-label`.
- Focus moves to `initialFocusRef`, otherwise the first focusable control, otherwise the dialog surface.
- Tab and Shift+Tab remain inside the topmost dialog, including an interactive popover opened within it.
- Escape and backdrop presses call `onOpenChange(false, { reason, originalEvent })` only when `dismissible` is true. Set `dismissOnBackdrop={false}` when an accidental outside press would be costly.
- Focus returns to `returnFocusRef`, then `triggerRef`, then the element active when the dialog opened.
- Background body children are inert and hidden from the accessibility tree while a modal is open. Nested kit dialogs restore the previous layer correctly.
- A danger dialog defaults to its close control unless an explicit `initialFocusRef` is supplied; it never auto-focuses the destructive action.

`onOpenChange` reasons are `escape`, `backdrop`, or `close-button` for modal surfaces and `trigger`, `escape`, or `outside-pointer` for popovers.

## Loading, empty, and retry states

```jsx
<SkeletonGroup label="Loading ladder standings">
  <Skeleton shape="pill" width="8rem" />
  <Skeleton shape="text" />
  <Skeleton shape="block" height="12rem" />
</SkeletonGroup>

<EmptyScene
  title="No rounds recorded"
  description="Finish a round to start your performance history."
  action={<ActionLink to="/game" intent="primary">Play a round</ActionLink>}
/>

<ErrorScene
  title="Standings unavailable"
  description="Your account is safe. Try loading the ladder again."
  onRetry={retry}
  isRetrying={isRetrying}
/>
```

Skeleton shapes are decorative and hidden from assistive technology; `SkeletonGroup` exposes one polite busy label. `EmptyScene` is a normal labelled section. `ErrorScene` announces a newly rendered error and disables its retry action while retrying.

## Fixture and review checklist

Open the development-only `/__ui-kit` route for the integrated visual fixture.

The development fixture should exercise, without migrating production routes:

- borderless neutral/Practice/Casual/Ranked stages;
- action default, hover, focus, pressed, selected, disabled, loading, success, warning, error, locked, owned/equipped, and affordable/unaffordable states;
- horizontal and vertical tabs, a disabled tab, and a native segmented control;
- every badge status and determinate/indeterminate progress;
- focus-triggered tooltip and keyboard-operable popover;
- modal, danger modal, explicit responsive-sheet modal, and `MobileSheet`;
- skeleton, empty, error, and retrying scenes;
- 320/390/768/1024/1440 widths, 200% zoom, keyboard-only operation, forced colors, and reduced motion.

Automated interaction coverage lives in `tests/uiPrimitives.test.jsx` and runs in jsdom through `vitest.config.js`. It covers tab relationships and key behavior, dialog focus trap/Escape/restore behavior, sheet parity, tooltip focus behavior, popover disclosure behavior, and disabled action-link semantics.
