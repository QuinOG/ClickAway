import { useEffect } from "react"

// Workshop overlays (Spec Sheet, Compare Modes, Unlock Wall): Escape closes
// the open overlay, and focus returns to whatever opened it.
export function useOverlayDismiss(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined
    const opener = document.activeElement
    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      event.preventDefault()
      onClose?.()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus()
    }
  }, [isOpen, onClose])
}
