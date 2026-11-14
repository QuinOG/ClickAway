import { useEffect, useRef } from "react"

const openDialogs = []

// Keep workshop keyboard focus inside the open dialog and restore its opener.
export function useOverlayDismiss(isOpen, onClose) {
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!isOpen) return undefined
    const dialog = dialogRef.current
    if (!dialog) return undefined
    const opener = document.activeElement
    openDialogs.push(dialog)
    const controls = () => Array.from(dialog.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]'
    )).filter((node) => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length)
    const focusFirst = () => (controls()[0] || dialog).focus({ preventScroll: true })
    focusFirst()
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || openDialogs.at(-1) !== dialog) return
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current?.()
      }
      if (event.key !== "Tab") return
      const items = controls()
      const target = event.shiftKey ? items.at(-1) : items[0]
      if (!items.length || !dialog.contains(document.activeElement)
        || document.activeElement === (event.shiftKey ? items[0] : items.at(-1))) {
        event.preventDefault()
        ;(target || dialog).focus({ preventScroll: true })
      }
    }
    const handleFocus = (event) => {
      if (openDialogs.at(-1) === dialog && !dialog.contains(event.target)) focusFirst()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("focusin", handleFocus)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("focusin", handleFocus)
      openDialogs.splice(openDialogs.indexOf(dialog), 1)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [isOpen])
  return dialogRef
}
