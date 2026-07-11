import { useId } from "react"

import { joinClassNames } from "../internal/react.js"

export function SegmentedControl({
  legend,
  hideLegend = false,
  name,
  value,
  onValueChange,
  options = [],
  size = "md",
  className = "",
  disabled = false,
  ...restProps
}) {
  const generatedId = useId().replaceAll(":", "")
  const resolvedName = name || `ui-segmented-${generatedId}`

  return (
    <fieldset
      className={joinClassNames("uiSegmentedControl", className)}
      data-size={size}
      disabled={disabled}
      {...restProps}
    >
      <legend className={hideLegend ? "uiVisuallyHidden" : "uiSegmentedLegend"}>
        {legend}
      </legend>
      <div className="uiSegmentedOptions">
        {options.map((option) => {
          const optionId = `${resolvedName}-${encodeURIComponent(String(option.value)).replaceAll("%", "-")}`
          const descriptionId = option.description ? `${optionId}-description` : undefined

          return (
            <label key={option.value} className="uiSegmentedOption" htmlFor={optionId}>
              <input
                id={optionId}
                className="uiSegmentedInput"
                type="radio"
                name={resolvedName}
                value={option.value}
                checked={value === option.value}
                disabled={option.disabled}
                aria-describedby={descriptionId}
                onChange={() => onValueChange?.(option.value)}
              />
              <span className="uiSegmentedLabel">
                <span className="uiSegmentedLabelText">{option.label}</span>
                {option.description ? (
                  <span id={descriptionId} className="uiSegmentedDescription">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
