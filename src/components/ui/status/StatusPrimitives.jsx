import { createElement, useId } from "react"

import { ActionButton } from "../actions/Action.jsx"
import { joinClassNames } from "../internal/react.js"

export function Badge({
  as = "span",
  status = "neutral",
  mode,
  icon,
  className = "",
  children,
  ...restProps
}) {
  return createElement(as, {
    className: joinClassNames("uiBadge", className),
    "data-status": status,
    "data-mode": mode,
    ...restProps,
  },
  icon ? <span className="uiBadgeIcon" aria-hidden="true">{icon}</span> : null,
  <span className="uiBadgeLabel">{children}</span>)
}

function clampProgressValue(value, max) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.min(max, Math.max(0, numericValue))
}

export function ProgressMeter({
  label,
  value,
  max = 100,
  valueText,
  tone = "neutral",
  size = "md",
  isIndeterminate = false,
  showValue = true,
  hideLabel = false,
  className = "",
  ...restProps
}) {
  const generatedId = useId().replaceAll(":", "")
  const labelId = `ui-progress-label-${generatedId}`
  const normalizedMax = Number.isFinite(Number(max)) && Number(max) > 0 ? Number(max) : 100
  const normalizedValue = clampProgressValue(value, normalizedMax)
  const fallbackValueText = `${Math.round((normalizedValue / normalizedMax) * 100)}%`
  const resolvedValueText = valueText || fallbackValueText

  return (
    <div
      className={joinClassNames("uiProgressMeter", className)}
      data-tone={tone}
      data-size={size}
      data-state={isIndeterminate ? "indeterminate" : "determinate"}
      {...restProps}
    >
      <div className="uiProgressHeader">
        <span id={labelId} className={hideLabel ? "uiVisuallyHidden" : "uiProgressLabel"}>
          {label}
        </span>
        {showValue && !isIndeterminate ? (
          <span className="uiProgressValue" aria-hidden="true">{resolvedValueText}</span>
        ) : null}
      </div>
      <progress
        className="uiProgressNative"
        max={normalizedMax}
        value={isIndeterminate ? undefined : normalizedValue}
        aria-labelledby={labelId}
        aria-valuetext={isIndeterminate ? "Loading" : resolvedValueText}
      >
        {isIndeterminate ? "Loading" : resolvedValueText}
      </progress>
    </div>
  )
}

export function Skeleton({
  as = "span",
  shape = "block",
  width,
  height,
  className = "",
  style,
  ...restProps
}) {
  return createElement(as, {
    className: joinClassNames("uiSkeleton", className),
    "data-shape": shape,
    "aria-hidden": "true",
    style: { width, height, ...style },
    ...restProps,
  })
}

export function SkeletonGroup({
  as = "div",
  label = "Loading content",
  className = "",
  children,
  ...restProps
}) {
  return createElement(as, {
    className: joinClassNames("uiSkeletonGroup", className),
    "aria-busy": "true",
    "aria-live": "polite",
    ...restProps,
  }, <span className="uiVisuallyHidden">{label}</span>, children)
}

function StateScene({
  kind,
  icon,
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
  ...restProps
}) {
  const generatedId = useId().replaceAll(":", "")
  const titleId = `ui-state-title-${generatedId}`
  const descriptionId = description ? `ui-state-description-${generatedId}` : undefined

  return (
    <section
      className={joinClassNames("uiStateScene", className)}
      data-kind={kind}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      {...restProps}
    >
      {icon ? <div className="uiStateSceneIcon" aria-hidden="true">{icon}</div> : null}
      {eyebrow ? <p className="uiStateSceneEyebrow">{eyebrow}</p> : null}
      <h2 id={titleId} className="uiStateSceneTitle">{title}</h2>
      {description ? (
        <p id={descriptionId} className="uiStateSceneDescription">{description}</p>
      ) : null}
      {children}
      {actions ? <div className="uiStateSceneActions">{actions}</div> : null}
    </section>
  )
}

export function EmptyScene({
  icon,
  eyebrow = "Nothing here yet",
  title,
  description,
  action,
  className = "",
  children,
  ...restProps
}) {
  return (
    <StateScene
      kind="empty"
      icon={icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={action}
      className={className}
      {...restProps}
    >
      {children}
    </StateScene>
  )
}

export function ErrorScene({
  icon,
  eyebrow = "Something went wrong",
  title,
  description,
  onRetry,
  isRetrying = false,
  retryLabel = "Try again",
  retryingLabel = "Retrying…",
  className = "",
  children,
  ...restProps
}) {
  const retryAction = onRetry ? (
    <ActionButton
      intent="primary"
      status="error"
      onClick={onRetry}
      isLoading={isRetrying}
      loadingLabel={retryingLabel}
    >
      {retryLabel}
    </ActionButton>
  ) : null

  return (
    <StateScene
      kind="error"
      icon={icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={retryAction}
      className={className}
      role="alert"
      aria-live="assertive"
      aria-busy={isRetrying || undefined}
      {...restProps}
    >
      {children}
      {isRetrying ? <span className="uiVisuallyHidden">{retryingLabel}</span> : null}
    </StateScene>
  )
}
