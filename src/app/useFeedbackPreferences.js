import { useContext } from "react"

import { FeedbackPreferencesContext } from "./feedbackPreferencesContextValue.js"

export function useFeedbackPreferences() {
  const contextValue = useContext(FeedbackPreferencesContext)
  if (!contextValue) {
    throw new Error("useFeedbackPreferences must be used inside FeedbackPreferencesProvider")
  }
  return contextValue
}
