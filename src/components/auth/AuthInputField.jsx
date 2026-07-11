import { useId, useState } from "react"

function getHintToneClassName(hintTone = "neutral") {
  if (hintTone === "error") return "authHint-error"
  if (hintTone === "success") return "authHint-success"
  if (hintTone === "warning") return "authHint-warning"
  return "authHint-neutral"
}

export default function AuthInputField({
  label,
  type = "text",
  error = "",
  hint = "",
  hintTone = "neutral",
  ...inputProps
}) {
  const inputId = useId()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPasswordField = type === "password"
  const helperText = error || hint
  const inputType = isPasswordField && isPasswordVisible ? "text" : type
  const hintToneClassName = getHintToneClassName(error ? "error" : hintTone)
  const hintId = helperText ? `${inputId}-hint` : undefined
  const inputClassName = `authInput${error ? " isInvalid" : ""}${isPasswordField ? " authInputWithToggle" : ""}`

  return (
    <div className="authField">
      <label className="authLabel" htmlFor={inputId}>
        {label}
      </label>

      <div className={`authInputRow${isPasswordField ? " hasToggle" : ""}`}>
        <input
          {...inputProps}
          id={inputId}
          type={inputType}
          className={inputClassName}
          aria-invalid={Boolean(error)}
          aria-describedby={hintId}
        />

        {isPasswordField ? (
          <button
            type="button"
            className="authPasswordToggle"
            aria-label={`${isPasswordVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>

      {helperText ? (
        <p
          id={hintId}
          className={`authHint ${hintToneClassName}`}
          role={error ? "alert" : "status"}
          aria-live={error ? "assertive" : "polite"}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
