import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(e) {
    e.preventDefault()
    onLogin?.()
    // Temporary client-side auth success until backend login/token flow is available.
    navigate("/game")
  }

  return (
    <div className="pageCenter">
      <section className="cardWide">
        <h1 className="cardTitle">Login</h1>

        <form onSubmit={handleSubmit} className="formGrid">
          <label className="labelRow">
            <span>Username:</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" required />
          </label>

          <label className="labelRow">
            <span>Password:</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
          </label>

          <div>
            <button className="primaryButton" type="submit">Login</button>
          </div>
        </form>
      </section>
    </div>
  )
}
