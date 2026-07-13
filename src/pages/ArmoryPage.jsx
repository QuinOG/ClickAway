import { useContext } from "react"

import ArmoryScreen from "../features/armory/components/ArmoryScreen.jsx"
import { useArmoryScreenController } from "../features/armory/hooks/useArmoryScreenController.js"
import { FeedbackPreferencesContext } from "../app/feedbackPreferencesContextValue.js"

export default function ArmoryPage(props) {
  // Read the context directly (not the throwing `useFeedbackPreferences`
  // hook): the workshop's voice (Phase 13) is optional polish, so a missing
  // provider — e.g. in screen tests that render this page standalone —
  // degrades to silent rather than a crash.
  const emitFeedback = useContext(FeedbackPreferencesContext)?.emitFeedback ?? null
  const controller = useArmoryScreenController({ ...props, emitFeedback })

  if (!controller.isReady) {
    return null
  }

  return <ArmoryScreen {...controller} />
}
