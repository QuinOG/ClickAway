import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import AuthInputField from "../components/auth/AuthInputField.jsx"
import AuthArenaArrival from "../components/auth/AuthArenaArrival.jsx"
import { ActionButton } from "../components/ui/index.js"

function getUsernameError(username = "") {
  const trimmedUsername = username.trim()
  if (!trimmedUsername) return "Choose a username."
  if (trimmedUsername.length < 3) return "Username must be at least 3 characters."
  if (trimmedUsername.length > 32) return "Username must be 32 characters or less."
  return ""
}

function getPasswordError(password = "") {
  if (!password) return "Create a password."
  if (password.length < 8) return "Password must be at least 8 characters."
  if (password.length > 128) return "Password must be 128 characters or less."
  return ""
}

function getConfirmPasswordError(password = "", confirmPassword = "") {
  if (!confirmPassword) return "Re-enter your password."
  if (password !== confirmPassword) return "Passwords must match."
  return ""
}

function getUsernameHint(username = "", shouldShowValidation = false) {
  const trimmedUsername = username.trim()

  if (shouldShowValidation && !trimmedUsername) {
    return { text: getUsernameError(username), tone: "error" }
  }

  if (!trimmedUsername) {
    return {
      text: "This is the name shown on your profile and leaderboard.",
      tone: "neutral",
    }
  }

  if (trimmedUsername.length < 3) {
    return {
      text: "Username must be at least 3 characters.",
      tone: "warning",
    }
  }

  return { text: `Looking good: "${trimmedUsername}" `, tone: "success" }
}

function getPasswordHint(password = "", shouldShowValidation = false) {
  if (shouldShowValidation && !password) {
    return { text: getPasswordError(password), tone: "error" }
  }

  if (!password) {
    return {
      text: "Use at least 8 characters for a stronger password.",
      tone: "neutral",
    }
  }

  if (password.length < 8) {
    return {
      text: "Password must be at least 8 characters.",
      tone: "warning",
    }
  }

  return { text: "Password strength looks solid.", tone: "success" }
}

function getConfirmPasswordHint(password = "", confirmPassword = "", shouldShowValidation = false) {
  if (shouldShowValidation && !confirmPassword) {
    return { text: getConfirmPasswordError(password, confirmPassword), tone: "error" }
  }

  if (!confirmPassword) {
    return {
      text: "Type the same password again to confirm it.",
      tone: "neutral",
    }
  }

  if (password !== confirmPassword) {
    return { text: "Passwords do not match yet.", tone: "error" }
  }

  return { text: "Passwords match.", tone: "success" }
}

export default function SignupPage({ onSignup }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touchedFields, setTouchedFields] = useState({
    username: false,
    password: false,
    confirmPassword: false,
  })
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const shouldShowUsernameValidation = touchedFields.username || hasSubmitted
  const shouldShowPasswordValidation = touchedFields.password || hasSubmitted
  const shouldShowConfirmValidation = touchedFields.confirmPassword || hasSubmitted
  const usernameError = shouldShowUsernameValidation ? getUsernameError(username) : ""
  const passwordError = shouldShowPasswordValidation ? getPasswordError(password) : ""
  const confirmPasswordError = shouldShowConfirmValidation
    ? getConfirmPasswordError(password, confirmPassword)
    : ""
  const usernameHint = getUsernameHint(username, shouldShowUsernameValidation)
  const passwordHint = getPasswordHint(password, shouldShowPasswordValidation)
  const confirmPasswordHint = getConfirmPasswordHint(
    password,
    confirmPassword,
    shouldShowConfirmValidation
  )

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

    if (
      isSubmitting ||
      getUsernameError(username) ||
      getPasswordError(password) ||
      getConfirmPasswordError(password, confirmPassword)
    ) {
      return
    }

    setIsSubmitting(true)
    const signupResult = await onSignup?.(username.trim(), password)
    if (signupResult?.ok === false) {
      setSubmitError(signupResult.error || "Unable to create account.")
      setIsSubmitting(false)
      return
    }

    setSubmitError("")
    setIsSubmitting(false)
    navigate("/game")
  }

  return (
    <AuthArenaArrival mode="signup">
      <div className="authCard">
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
            placeholder="Choose a username"
            error={usernameError}
            hint={usernameHint.text}
            hintTone={usernameHint.tone}
            autoFocus
            required
            minLength={3}
            maxLength={32}
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
            autoComplete="new-password"
            placeholder="Create a password"
            error={passwordError}
            hint={passwordHint.text}
            hintTone={passwordHint.tone}
            required
            minLength={8}
            maxLength={128}
            disabled={isSubmitting}
          />

          <AuthInputField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setSubmitError("")
            }}
            onBlur={() => markFieldTouched("confirmPassword")}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={confirmPasswordError}
            hint={confirmPasswordHint.text}
            hintTone={confirmPasswordHint.tone}
            required
            minLength={8}
            maxLength={128}
            disabled={isSubmitting}
          />

          <ActionButton
            className="authButton"
            type="submit"
            intent="primary"
            size="lg"
            isLoading={isSubmitting}
            loadingLabel="Creating competitor…"
          >
            Create competitor
          </ActionButton>

          {submitError ? (
            <p className="authHint authHint-error" role="alert">
              {submitError}
            </p>
          ) : null}
        </form>

        <div className="authFooter">
          <span className="authFooterText">Already have an account?</span>
          <Link className="authFooterLink" to="/login">
            Login instead
          </Link>
        </div>
      </div>
    </AuthArenaArrival>
  )
}
