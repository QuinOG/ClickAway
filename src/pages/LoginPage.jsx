import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import AuthInputField from "../components/auth/AuthInputField.jsx"

function getUsernameError(username = "") {
  return username.trim() ? "" : "Enter your username."
}

function getPasswordError(password = "") {
  return password ? "" : "Enter your password."
}

function getUsernameHint(username = "", shouldShowValidation = false) {
  const trimmedUsername = username.trim()

  if (shouldShowValidation && !trimmedUsername) {
    return { text: getUsernameError(username), tone: "error" }
  }

  if (!trimmedUsername) {
    return {
      text: "Use the same username shown on your ClickAway profile.",
      tone: "neutral",
    }
  }

  return { text: `Ready to continue as ${trimmedUsername}.`, tone: "success" }
}

function getPasswordHint(password = "", shouldShowValidation = false) {
  if (shouldShowValidation && !password) {
    return { text: getPasswordError(password), tone: "error" }
  }

  if (!password) {
    return {
      text: "Enter the password tied to this account.",
      tone: "neutral",
    }
  }

  return { text: "Password entered.", tone: "success" }
}

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touchedFields, setTouchedFields] = useState({
    username: false,
    password: false,
  })
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const shouldShowUsernameValidation = touchedFields.username || hasSubmitted
  const shouldShowPasswordValidation = touchedFields.password || hasSubmitted
  const usernameError = shouldShowUsernameValidation ? getUsernameError(username) : ""
  const passwordError = shouldShowPasswordValidation ? getPasswordError(password) : ""
  const usernameHint = getUsernameHint(username, shouldShowUsernameValidation)
  const passwordHint = getPasswordHint(password, shouldShowPasswordValidation)

  function markFieldTouched(fieldName) {
    setTouchedFields((currentFields) => (
      currentFields[fieldName]
        ? currentFields
        : { ...currentFields, [fieldName]: true }
    ))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setHasSubmitted(true)

    if (isSubmitting || getUsernameError(username) || getPasswordError(password)) {
      return
    }

    setIsSubmitting(true)
    const loginResult = await onLogin?.(username.trim(), password)
    if (loginResult?.ok === false) {
      setSubmitError(loginResult.error || "Unable to log in with those details.")
      setIsSubmitting(false)
      return
    }

    setSubmitError("")
    setIsSubmitting(false)
    navigate("/game")
  }

  return (
    <div className="pageCenter">
      <section className="cardWide authCard">
        <h1 className="cardTitle authTitle">Login</h1>
        <p className="muted authSubtitle">
          Return to Reflex Arena and keep your streak moving.
        </p>

        <form onSubmit={handleSubmit} className="authForm" noValidate>
          <AuthInputField
            label="Username"
            name="username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setSubmitError("")
            }}
            onBlur={() => markFieldTouched("username")}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Enter username"
            error={usernameError}
            hint={usernameHint.text}
            hintTone={usernameHint.tone}
            autoFocus
            required
            disabled={isSubmitting}
          />

          <AuthInputField
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setSubmitError("")
            }}
            onBlur={() => markFieldTouched("password")}
            autoComplete="current-password"
            placeholder="Enter password"
            error={passwordError}
            hint={passwordHint.text}
            hintTone={passwordHint.tone}
            required
            disabled={isSubmitting}
          />

          <button className="primaryButton authButton" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>

          {submitError ? (
            <p className="authHint authHint-error" role="alert">
              {submitError}
            </p>
          ) : null}
        </form>

        <div className="authFooter">
          <span className="authFooterText">Need a new account?</span>
          <Link className="authFooterLink" to="/signup">
            Create account
          </Link>
        </div>
      </section>
    </div>
  )
}
