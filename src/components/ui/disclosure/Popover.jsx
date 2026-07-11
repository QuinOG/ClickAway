import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

import { assignRef, joinClassNames } from "../internal/react.js"
import { focusElement } from "../overlays/dialogA11y.js"
import { useAnchoredPosition } from "./useAnchoredPosition.js"

export function Popover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  title,
  description,
  "aria-label": ariaLabel,
  placement = "bottom-start",
  offset = 8,
  initialFocusRef,
  className = "",
  children,
  content,
}) {
  const child = Children.only(children)
  if (!isValidElement(child)) {
    throw new Error("Popover requires one disclosure element.")
  }

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const generatedId = useId().replaceAll(":", "")
  const popoverId = `ui-popover-${generatedId}`
  const titleId = `${popoverId}-title`
  const descriptionId = `${popoverId}-description`
  const anchorRef = useRef(null)
  const popoverRef = useRef(null)
  const [portalContext, setPortalContext] = useState(null)
  const { ref: childRef, onClick: childOnClick } = child.props

  const setOpen = useCallback((nextOpen, reason, originalEvent) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen)
    onOpenChange?.(nextOpen, { reason, originalEvent })
  }, [controlledOpen, onOpenChange])

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

  const handleTriggerClick = useCallback((event) => {
    childOnClick?.(event)
    if (event.defaultPrevented) return
    setOpen(!isOpen, "trigger", event)
  }, [childOnClick, isOpen, setOpen])

  useAnchoredPosition({
    open: isOpen,
    anchorRef,
    floatingRef: popoverRef,
    placement,
    offset,
  })

  useLayoutEffect(() => {
    if (!isOpen) return undefined
    const anchor = anchorRef.current
    const popover = popoverRef.current
    if (initialFocusRef?.current) focusElement(initialFocusRef.current)

    return () => {
      if (popover?.contains(document.activeElement) && anchor?.isConnected) {
        focusElement(anchor)
      }
    }
  }, [initialFocusRef, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      const eventPath = event.composedPath?.() || []
      const clickedAnchor = eventPath.includes(anchorRef.current)
        || anchorRef.current?.contains(event.target)
      const clickedPopover = eventPath.includes(popoverRef.current)
        || popoverRef.current?.contains(event.target)
      if (clickedAnchor || clickedPopover) return
      setOpen(false, "outside-pointer", event)
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") return
      event.preventDefault()
      setOpen(false, "escape", event)
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [isOpen, setOpen])

  // The callback ref is invoked by React during commit; cloneElement keeps the
  // disclosure attributes on the native trigger instead of a wrapper element.
  // eslint-disable-next-line react-hooks/refs
  const trigger = cloneElement(child, {
    ref: setAnchorNode,
    "aria-expanded": isOpen,
    "aria-controls": isOpen ? popoverId : undefined,
    "aria-haspopup": "dialog",
    onClick: handleTriggerClick,
  })

  return (
    <>
      {trigger}
      {isOpen && portalContext ? createPortal(
        <section
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label={title ? undefined : ariaLabel}
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          className={joinClassNames("uiPopover", className)}
          data-placement={placement}
          data-ui-dialog-owned={portalContext.ownerId}
          tabIndex={-1}
        >
          {title ? <h2 id={titleId} className="uiPopoverTitle">{title}</h2> : null}
          {description ? (
            <p id={descriptionId} className="uiPopoverDescription">{description}</p>
          ) : null}
          <div className="uiPopoverBody">{content}</div>
        </section>,
        portalContext.container
      ) : null}
    </>
  )
}
