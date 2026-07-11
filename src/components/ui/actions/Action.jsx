import { forwardRef } from "react"
import { Link } from "react-router-dom"

import { joinClassNames } from "../internal/react.js"

function ActionContent({
  children,
  iconStart,
  iconEnd,
  isLoading,
  loadingLabel,
}) {
  return (
    <>
      {isLoading ? <span className="uiActionSpinner" aria-hidden="true" /> : null}
      {!isLoading && iconStart ? <span className="uiActionIcon" aria-hidden="true">{iconStart}</span> : null}
      <span className="uiActionLabel">{isLoading ? loadingLabel : children}</span>
      {!isLoading && iconEnd ? <span className="uiActionIcon" aria-hidden="true">{iconEnd}</span> : null}
    </>
  )
}

function getActionClassName(className) {
  return joinClassNames("uiAction", className)
}

function LockGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.25 7V5.25a2.75 2.75 0 0 1 5.5 0V7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export const ActionButton = forwardRef(function ActionButton({
  intent = "secondary",
  size = "md",
  status = "idle",
  isLoading = false,
  loadingLabel = "Working…",
  isSelected,
  isLocked = false,
  lockedReason,
  iconStart,
  iconEnd,
  className = "",
  disabled = false,
  type = "button",
  children,
  ...restProps
}, forwardedRef) {
  const isUnavailable = disabled || isLoading || isLocked
  const resolvedStatus = isLocked ? "locked" : isLoading ? "loading" : status

  return (
    <button
      ref={forwardedRef}
      {...restProps}
      type={type}
      className={getActionClassName(className)}
      data-intent={intent}
      data-size={size}
      data-status={resolvedStatus}
      disabled={isUnavailable}
      aria-busy={isLoading || undefined}
      aria-pressed={typeof isSelected === "boolean" ? isSelected : undefined}
    >
      <ActionContent
        iconStart={isLocked && !iconStart ? <LockGlyph /> : iconStart}
        iconEnd={iconEnd}
        isLoading={isLoading}
        loadingLabel={loadingLabel}
      >
        {children}
        {isLocked ? (
          <span className="uiVisuallyHidden">
            {lockedReason ? ` — Locked: ${lockedReason}` : " — Locked"}
          </span>
        ) : null}
      </ActionContent>
    </button>
  )
})

export const ActionLink = forwardRef(function ActionLink({
  to,
  href,
  intent = "secondary",
  size = "md",
  status = "idle",
  isDisabled = false,
  isLoading = false,
  loadingLabel = "Loading…",
  isSelected,
  iconStart,
  iconEnd,
  className = "",
  onClick,
  children,
  ...restProps
}, forwardedRef) {
  const isUnavailable = isDisabled || isLoading
  const resolvedStatus = isLoading ? "loading" : status
  const sharedProps = {
    ref: forwardedRef,
    className: getActionClassName(className),
    "data-intent": intent,
    "data-size": size,
    "data-status": resolvedStatus,
    "aria-busy": isLoading || undefined,
    "aria-disabled": isUnavailable || undefined,
    "aria-current": isSelected ? "page" : restProps["aria-current"],
    onClick: (event) => {
      if (isUnavailable) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      onClick?.(event)
    },
  }

  const content = (
    <ActionContent
      iconStart={iconStart}
      iconEnd={iconEnd}
      isLoading={isLoading}
      loadingLabel={loadingLabel}
    >
      {children}
    </ActionContent>
  )

  const linkRestProps = { ...restProps }
  delete linkRestProps["aria-current"]

  if (to !== undefined) {
    return (
      <Link to={to} {...linkRestProps} {...sharedProps}>
        {content}
      </Link>
    )
  }

  return (
    <a href={href} {...linkRestProps} {...sharedProps}>
      {content}
    </a>
  )
})
