import { useEffectEvent, useId, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"

import { joinClassNames } from "../internal/react.js"
import {
  focusElement,
  getDialogFocusableElements,
  getFocusableElements,
  hasOwnedEscapeDismissableLayer,
  isInsideDialogFocusScope,
  isTopModalLayer,
  registerModalLayer,
} from "./dialogA11y.js"

function getInitialFocusTarget(surface, initialFocusRef, closeButton, tone) {
  if (initialFocusRef?.current) return initialFocusRef.current
  if (tone === "danger" && closeButton) return closeButton
  return getFocusableElements(surface)[0] || surface
}

function updateTransformOrigin(surface, trigger) {
  if (!surface || !trigger || typeof trigger.getBoundingClientRect !== "function") return
  const triggerRect = trigger.getBoundingClientRect()
  const surfaceRect = surface.getBoundingClientRect()
  const originX = triggerRect.left + (triggerRect.width / 2) - surfaceRect.left
  const originY = triggerRect.top + (triggerRect.height / 2) - surfaceRect.top
  surface.style.setProperty("--ui-dialog-origin-x", `${Math.round(originX)}px`)
  surface.style.setProperty("--ui-dialog-origin-y", `${Math.round(originY)}px`)
}

export function OverlayDialog({
  open,
  onOpenChange,
  title,
  description,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  triggerRef,
  returnFocusRef,
  initialFocusRef,
  dismissible = true,
  dismissOnBackdrop = true,
  closeLabel = "Close dialog",
  presentation = "modal",
  mobilePresentation,
  size = "md",
  tone = "neutral",
  footer,
  className = "",
  surfaceClassName = "",
  children,
  ...restProps
}) {
  const generatedId = useId().replaceAll(":", "")
  const titleId = `ui-dialog-title-${generatedId}`
  const descriptionId = `ui-dialog-description-${generatedId}`
  const focusScopeId = `ui-dialog-scope-${generatedId}`
  const layerRef = useRef(null)
  const surfaceRef = useRef(null)
  const closeButtonRef = useRef(null)
  const capturedReturnFocusRef = useRef(null)
  const requestClose = useEffectEvent((reason, originalEvent) => {
    if (!dismissible) return
    onOpenChange?.(false, { reason, originalEvent })
  })

  useLayoutEffect(() => {
    if (!open) return undefined

    const layer = layerRef.current
    const surface = surfaceRef.current
    if (!layer || !surface) return undefined

    capturedReturnFocusRef.current = returnFocusRef?.current
      || triggerRef?.current
      || document.activeElement

    const unregisterModalLayer = registerModalLayer(layer)
    updateTransformOrigin(surface, triggerRef?.current)
    focusElement(getInitialFocusTarget(
      surface,
      initialFocusRef,
      closeButtonRef.current,
      tone
    ))

    function handleKeyDown(event) {
      if (!isTopModalLayer(layer)) return

      if (event.key === "Escape") {
        if (hasOwnedEscapeDismissableLayer(layer, focusScopeId)) return
        event.preventDefault()
        event.stopPropagation()
        requestClose("escape", event)
        return
      }

      if (event.key !== "Tab") return

      const focusableElements = getDialogFocusableElements(surface, layer, focusScopeId)
      if (focusableElements.length === 0) {
        event.preventDefault()
        focusElement(surface)
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      const activeElement = document.activeElement

      if (event.shiftKey && (activeElement === firstElement || !surface.contains(activeElement))) {
        event.preventDefault()
        focusElement(lastElement)
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        focusElement(firstElement)
      }
    }

    function handleFocusIn(event) {
      if (
        !isTopModalLayer(layer)
        || isInsideDialogFocusScope(event.target, surface, layer, focusScopeId)
      ) return
      focusElement(getDialogFocusableElements(surface, layer, focusScopeId)[0] || surface)
    }

    document.addEventListener("keydown", handleKeyDown, true)
    document.addEventListener("focusin", handleFocusIn, true)

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("focusin", handleFocusIn, true)
      unregisterModalLayer()

      const returnTarget = capturedReturnFocusRef.current
      if (returnTarget?.isConnected) focusElement(returnTarget)
      capturedReturnFocusRef.current = null
    }
  }, [focusScopeId, initialFocusRef, open, returnFocusRef, tone, triggerRef])

  if (!open || typeof document === "undefined") return null

  function handleBackdropClick(event) {
    if (event.target !== event.currentTarget || !dismissOnBackdrop) return
    if (!dismissible) return
    onOpenChange?.(false, { reason: "backdrop", originalEvent: event })
  }

  return createPortal(
    <div
      ref={layerRef}
      className={joinClassNames("uiOverlayLayer", className)}
      data-ui-overlay-layer=""
      data-ui-dialog-scope={focusScopeId}
      data-presentation={presentation}
      data-mobile-presentation={mobilePresentation}
      onMouseDown={handleBackdropClick}
    >
      <section
        ref={surfaceRef}
        {...restProps}
        className={joinClassNames("uiDialogSurface", surfaceClassName)}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : ariaDescribedBy}
        tabIndex={-1}
        data-presentation={presentation}
        data-size={size}
        data-tone={tone}
        data-ui-dialog-scope={focusScopeId}
      >
        <header className="uiDialogHeader">
          <div className="uiDialogHeadingGroup">
            {title ? <h2 id={titleId} className="uiDialogTitle">{title}</h2> : null}
            {description ? (
              <p id={descriptionId} className="uiDialogDescription">{description}</p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              ref={closeButtonRef}
              type="button"
              className="uiDialogClose"
              aria-label={closeLabel}
              onClick={(event) => onOpenChange?.(
                false,
                { reason: "close-button", originalEvent: event }
              )}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </header>
        <div className="uiDialogBody">{children}</div>
        {footer ? <footer className="uiDialogFooter">{footer}</footer> : null}
      </section>
    </div>,
    document.body
  )
}

export function Modal(props) {
  return <OverlayDialog presentation="modal" {...props} />
}

export function MobileSheet(props) {
  return <OverlayDialog presentation="sheet" {...props} />
}
