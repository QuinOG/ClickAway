import { useMemo, useState } from "react"
import { SpeakerHigh, SpeakerSlash, Waveform } from "@phosphor-icons/react"
import "../styles/components/settings.css"

import { DEFAULT_FEEDBACK_PREFERENCES } from "../app/feedbackPreferences.js"
import { useFeedbackPreferences } from "../app/useFeedbackPreferences.js"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"
import {
  ActionButton,
  Badge,
  MobileSheet,
  SegmentedControl,
} from "./ui/index.js"

const INTENSITY_OPTIONS = [
  { value: "reduced", label: "Reduced" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
]

function arePreferencesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function RangeSetting({ id, label, value, disabled, onChange }) {
  const percentValue = Math.round(value * 100)

  return (
    <label className="feedbackRangeSetting" htmlFor={id}>
      <span className="feedbackSettingHeading">
        <span>{label}</span>
        <output htmlFor={id}>{percentValue}%</output>
      </span>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        step="5"
        value={percentValue}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  )
}

function ToggleSetting({ id, label, description, checked, disabled = false, onChange }) {
  return (
    <label className="feedbackToggleSetting" htmlFor={id}>
      <span className="feedbackToggleCopy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <span className="feedbackToggleControl">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true" />
      </span>
    </label>
  )
}

function FeedbackSettingsForm({ onRequestClose }) {
  const {
    preferences,
    systemReducedMotion,
    setPreferences,
    saveState,
    feedbackStatus: status,
    unlockFeedback,
    emitFeedback,
    previewFeedback,
  } = useFeedbackPreferences()
  const [draft, setDraft] = useState(preferences)
  const [testMessage, setTestMessage] = useState("")
  const isDirty = !arePreferencesEqual(draft, preferences)
  const isMotionReduced = draft.reduceMotion || systemReducedMotion
  const soundIcon = draft.muted ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />

  const audioStatusLabel = useMemo(() => {
    if (draft.muted) return "Muted"
    if (status.audio === "ready") return "Ready"
    if (status.audio === "unavailable") return "Unavailable"
    return "Unlocks on input"
  }, [draft.muted, status.audio])
  const audioStatusTone = draft.muted
    ? "neutral"
    : status.audio === "unavailable"
      ? "error"
      : status.audio === "ready"
        ? "success"
        : "warning"

  function updateDraft(key, value) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }))
    setTestMessage("")
  }

  async function handleTestCue() {
    const unlocked = await unlockFeedback()
    const result = previewFeedback(FEEDBACK_EVENTS.TEST, {
      eventId: `settings-test-${Date.now()}`,
      scope: "settings",
    }, draft)
    if (draft.muted) setTestMessage("Sound is muted.")
    else if (!unlocked) setTestMessage("Audio is unavailable in this browser.")
    else if (result.played) setTestMessage("Test cue played.")
    else setTestMessage("The test cue could not play.")
  }

  function handleApply() {
    setPreferences(draft)
    emitFeedback(FEEDBACK_EVENTS.ACTION_CONFIRM, {
      eventId: `settings-save-${Date.now()}`,
      scope: "settings",
    })
    setTestMessage("")
  }

  function handleResetDraft() {
    setDraft({ ...DEFAULT_FEEDBACK_PREFERENCES })
    setTestMessage("Defaults are ready to apply.")
  }

  function handleRestoreSaved() {
    setDraft(preferences)
    setTestMessage("")
    onRequestClose()
  }

  return (
    <form
      className="feedbackSettingsForm"
      onSubmit={(event) => {
        event.preventDefault()
        handleApply()
      }}
    >
      <section className="feedbackSettingsSection" aria-labelledby="feedback-audio-title">
        <div className="feedbackSettingsSectionHeader">
          <div>
            <p className="feedbackSettingsEyebrow">Audio</p>
            <h3 id="feedback-audio-title">Sound cues</h3>
          </div>
          <Badge status={audioStatusTone}>{audioStatusLabel}</Badge>
        </div>

        <ToggleSetting
          id="feedback-muted"
          label="Mute all sound"
          description="Visual feedback remains active when sound is off."
          checked={draft.muted}
          onChange={(checked) => updateDraft("muted", checked)}
        />
        <RangeSetting
          id="feedback-master-volume"
          label="Master volume"
          value={draft.masterVolume}
          disabled={draft.muted}
          onChange={(value) => updateDraft("masterVolume", value)}
        />
        <RangeSetting
          id="feedback-sfx-volume"
          label="Effect volume"
          value={draft.sfxVolume}
          disabled={draft.muted}
          onChange={(value) => updateDraft("sfxVolume", value)}
        />
        <ActionButton
          intent="secondary"
          size="sm"
          iconStart={soundIcon}
          onClick={handleTestCue}
        >
          Test cue
        </ActionButton>
      </section>

      <section className="feedbackSettingsSection" aria-labelledby="feedback-intensity-title">
        <p className="feedbackSettingsEyebrow">Intensity</p>
        <h3 id="feedback-intensity-title">Arena feedback</h3>
        <SegmentedControl
          legend="Feedback intensity"
          hideLegend
          name="feedback-intensity"
          value={draft.feedbackIntensity}
          options={INTENSITY_OPTIONS}
          onValueChange={(value) => updateDraft("feedbackIntensity", value)}
        />
        <ToggleSetting
          id="feedback-reduce-motion"
          label="Reduce motion"
          description="Uses short fades and state changes instead of travel or scale."
          checked={draft.reduceMotion}
          onChange={(checked) => updateDraft("reduceMotion", checked)}
        />
        <ToggleSetting
          id="feedback-screen-shake"
          label="Screen shake"
          description={isMotionReduced ? `${systemReducedMotion && !draft.reduceMotion ? "Your system setting disables" : "Reduced motion disables"} screen shake.` : "Adds brief miss and impact movement."}
          checked={draft.screenShake}
          disabled={isMotionReduced}
          onChange={(checked) => updateDraft("screenShake", checked)}
        />
        <ToggleSetting
          id="feedback-flashes"
          label="Celebration effects"
          description={isMotionReduced ? `${systemReducedMotion && !draft.reduceMotion ? "Your system setting reduces" : "Reduced motion disables"} celebration effects.` : "Allows confetti and brief brightness accents."}
          checked={draft.flashes}
          disabled={isMotionReduced}
          onChange={(checked) => updateDraft("flashes", checked)}
        />
        <ToggleSetting
          id="feedback-haptics"
          label="Touch vibration"
          description={status.hapticsAvailable ? "Short optional cues on supported devices." : "Vibration is not available in this browser."}
          checked={draft.haptics}
          disabled={!status.hapticsAvailable}
          onChange={(checked) => updateDraft("haptics", checked)}
        />
      </section>

      <div className="feedbackSettingsStatus" aria-live="polite">
        <Waveform size={17} aria-hidden="true" />
        <span>{testMessage || (isDirty ? "Changes are not applied yet." : saveState === "error" ? "Could not save preferences." : "Preferences are saved.")}</span>
      </div>

      <div className="feedbackSettingsActions">
        <ActionButton intent="quiet" size="sm" onClick={handleResetDraft}>
          Reset defaults
        </ActionButton>
        <span className="feedbackSettingsActionsSpacer" />
        <ActionButton intent="secondary" onClick={handleRestoreSaved}>
          {isDirty ? "Cancel" : "Close"}
        </ActionButton>
        <ActionButton intent="primary" type="submit" disabled={!isDirty}>
          Apply
        </ActionButton>
      </div>
    </form>
  )
}

export default function FeedbackSettingsSheet({
  open,
  onOpenChange,
  triggerRef,
}) {
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      triggerRef={triggerRef}
      title="Feedback settings"
      description="Tune sound, motion, flashes, shake, and optional touch cues independently."
      size="sm"
      surfaceClassName="feedbackSettingsSheet"
    >
      {open ? <FeedbackSettingsForm onRequestClose={() => onOpenChange(false)} /> : null}
    </MobileSheet>
  )
}
