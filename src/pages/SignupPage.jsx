import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function SignupPage({ onSignup }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(event) {
    event.preventDefault()

    if (password !== confirmPassword) {
      setError("Passwords must match.")
      return
    }

    setError("")
    onSignup?.()
    // Temporary client-side signup success until backend registration is available.
    navigate("/game")
  }

  return (
    <div className="pageCenter">
      <section className="cardWide">
        <h1 className="cardTitle">Sign Up</h1>

        <form onSubmit={handleSubmit} className="formGrid">
          <label className="labelRow">
            <span>Username:</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
            />
          </label>

          <label className="labelRow">
            <span>Password:</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </label>

          <label className="labelRow">
            <span>Confirm:</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              required
            />
          </label>

          {error ? <p className="muted">{error}</p> : null}

          <div>
            <button className="primaryButton" type="submit">Create Account</button>
          </div>
        </form>
      </section>
    </div>
  )
}
