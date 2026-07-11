export function composeEventHandlers(theirHandler, ourHandler, options = {}) {
  const { checkForDefaultPrevented = true } = options

  return (event) => {
    theirHandler?.(event)
    if (checkForDefaultPrevented && event.defaultPrevented) return
    ourHandler?.(event)
  }
}

export function mergeRefs(...refs) {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value)
      } else if (ref && typeof ref === "object") {
        ref.current = value
      }
    })
  }
}

export function assignRef(ref, value) {
  if (typeof ref === "function") ref(value)
  else if (ref && typeof ref === "object") ref.current = value
}

export function joinClassNames(...values) {
  return values.filter(Boolean).join(" ")
}
