import { createElement, useId } from "react"

import { joinClassNames } from "../internal/react.js"

function getHeadingTag(headingLevel) {
  const normalizedLevel = Math.min(6, Math.max(1, Number(headingLevel) || 2))
  return `h${normalizedLevel}`
}

export function Stage({
  as = "div",
  size = "wide",
  mode = "neutral",
  className = "",
  children,
  ...restProps
}) {
  return createElement(as, {
    className: joinClassNames("uiStage", className),
    "data-size": size,
    "data-mode": mode,
    ...restProps,
  }, children)
}

export function Scene({
  as = "section",
  eyebrow,
  title,
  headingLevel = 2,
  description,
  commands,
  className = "",
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...restProps
}) {
  const generatedId = useId().replaceAll(":", "")
  const titleId = `ui-scene-title-${generatedId}`
  const descriptionId = `ui-scene-description-${generatedId}`
  const resolvedLabelledBy = ariaLabelledBy || (title ? titleId : undefined)
  const header = (eyebrow || title || description || commands) ? (
    <header className="uiSceneHeader">
      <div className="uiSceneHeadingGroup">
        {eyebrow ? <p className="uiSceneEyebrow">{eyebrow}</p> : null}
        {title ? createElement(
          getHeadingTag(headingLevel),
          { id: titleId, className: "uiSceneTitle" },
          title
        ) : null}
        {description ? (
          <p id={descriptionId} className="uiSceneDescription">{description}</p>
        ) : null}
      </div>
      {commands ? <div className="uiSceneHeaderCommands">{commands}</div> : null}
    </header>
  ) : null

  return createElement(as, {
    className: joinClassNames("uiScene", className),
    "aria-label": resolvedLabelledBy ? undefined : ariaLabel,
    "aria-labelledby": resolvedLabelledBy,
    "aria-describedby": description ? descriptionId : ariaDescribedBy,
    ...restProps,
  }, header, <div className="uiSceneBody">{children}</div>)
}

export function CommandStrip({
  as = "div",
  primary,
  secondary,
  contextual,
  align = "start",
  className = "",
  "aria-label": ariaLabel,
  ...restProps
}) {
  return createElement(as, {
    className: joinClassNames("uiCommandStrip", className),
    "data-align": align,
    role: ariaLabel ? "group" : undefined,
    "aria-label": ariaLabel,
    ...restProps,
  },
  primary ? <div className="uiCommandStripPrimary">{primary}</div> : null,
  secondary ? <div className="uiCommandStripSecondary">{secondary}</div> : null,
  contextual ? <div className="uiCommandStripContextual">{contextual}</div> : null)
}

export function InsetDetail({
  as = "aside",
  title,
  tone = "neutral",
  className = "",
  children,
  "aria-label": ariaLabel,
  ...restProps
}) {
  const generatedId = useId().replaceAll(":", "")
  const titleId = `ui-inset-title-${generatedId}`

  return createElement(as, {
    className: joinClassNames("uiInsetDetail", className),
    "data-tone": tone,
    "aria-label": title ? undefined : ariaLabel,
    "aria-labelledby": title ? titleId : undefined,
    ...restProps,
  },
  title ? <h3 id={titleId} className="uiInsetDetailTitle">{title}</h3> : null,
  <div className="uiInsetDetailBody">{children}</div>)
}

export function StatReadout({
  label,
  value,
  detail,
  tone = "neutral",
  emphasis = "default",
  className = "",
  ...restProps
}) {
  return (
    <dl
      className={joinClassNames("uiStatReadout", className)}
      data-tone={tone}
      data-emphasis={emphasis}
      {...restProps}
    >
      <dt className="uiStatReadoutLabel">{label}</dt>
      <dd className="uiStatReadoutValue">{value}</dd>
      {detail ? <dd className="uiStatReadoutDetail">{detail}</dd> : null}
    </dl>
  )
}
