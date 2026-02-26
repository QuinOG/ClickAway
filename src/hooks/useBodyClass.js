import { useEffect } from "react"

/**
 * Adds a class to document.body while `isEnabled` is true.
 * @param {string} className
 * @param {boolean} isEnabled
 */
export function useBodyClass(className, isEnabled) {
  useEffect(() => {
    document.body.classList.toggle(className, isEnabled)

    return () => {
      document.body.classList.remove(className)
    }
  }, [className, isEnabled])
}
