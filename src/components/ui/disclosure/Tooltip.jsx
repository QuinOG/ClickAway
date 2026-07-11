import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

import { assignRef, joinClassNames } from "../internal/react.js"
import { useAnchoredPosition } from "./useAnchoredPosition.js"

export function Tooltip({
  content,
  placement = "top",
  offset = 8,
  className = "",
  children,
}) {
  const child = Children.only(children)
  if (!isValidElement(child)) {
    throw new Error("Tooltip requires one element that can receive focus.")
  }

  const generatedId = useId().replaceAll(":", "")
  const tooltipId = `ui-tooltip-${generatedId}`
  const anchorRef = useRef(null)
  const tooltipRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [portalContext, setPortalContext] = useState(null)
  const open = isHovered || isFocused
  const {
    ref: childRef,
    onMouseEnter: childOnMouseEnter,
    onMouseLeave: childOnMouseLeave,
    onFocus: childOnFocus,
    onBlur: childOnBlur,
    onKeyDown: childOnKeyDown,
  } = child.props

  const setAnchorNode = useCallback((node) => {
    anchorRef.current = node
    assignRef(childRef, node)

    if (node && typeof document !== "undefined") {
      const dialogSurface = node.closest(".uiDialogSurface")
      setPortalContext({
        container: dialogSurface?.closest(".uiOverlayLayer") || document.body,
        ownerId: dialogSurface?.dataset.uiDialogScope,
      })
    }
  }, [childRef])

  const handleMouseEnter = useCallback((event) => {
    childOnMouseEnter?.(event)
    if (!event.defaultPrevented) setIsHovered(true)
  }, [childOnMouseEnter])

  const handleMouseLeave = useCallback((event) => {
    childOnMouseLeave?.(event)
    if (!event.defaultPrevented) setIsHovered(false)
  }, [childOnMouseLeave])

  const handleFocus = useCallback((event) => {
    childOnFocus?.(event)
    if (!event.defaultPrevented) setIsFocused(true)
  }, [childOnFocus])

  const handleBlur = useCallback((event) => {
    childOnBlur?.(event)
    if (!event.defaultPrevented) setIsFocused(false)
  }, [childOnBlur])

  const handleKeyDown = useCallback((event) => {
    childOnKeyDown?.(event)
    if (event.defaultPrevented || event.key !== "Escape") return
    setIsHovered(false)
    setIsFocused(false)
  }, [childOnKeyDown])

  useAnchoredPosition({
    open,
    anchorRef,
    floatingRef: tooltipRef,
    placement,
    offset,
  })

  useEffect(() => {
    if (!open) return undefined

    function handleDocumentKeyDown(event) {
      if (event.key !== "Escape") return
      setIsHovered(false)
      setIsFocused(false)
    }

    document.addEventListener("keydown", handleDocumentKeyDown)
    return () => document.removeEventListener("keydown", handleDocumentKeyDown)
  }, [open])

  const existingDescription = child.props["aria-describedby"]
  // The callback ref is invoked by React during commit; cloneElement is required
  // so aria-describedby remains on the actual focusable trigger.
  // eslint-disable-next-line react-hooks/refs
  const trigger = cloneElement(child, {
    ref: setAnchorNode,
    "aria-describedby": open
      ? [existingDescription, tooltipId].filter(Boolean).join(" ")
      : existingDescription,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
  })

  return (
    <>
      {trigger}
      {open && content && portalContext ? createPortal(
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={joinClassNames("uiTooltip", className)}
          data-placement={placement}
          data-ui-dialog-owned={portalContext.ownerId}
        >
          {content}
        </div>,
        portalContext.container
      ) : null}
    </>
  )
}
