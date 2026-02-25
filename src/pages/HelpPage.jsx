export default function HelpPage() {
  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Help Documentation</h1>

        <h2 className="cardH2">Account Access</h2>
        <ul className="bullets">
          <li>How to register</li>
          <li>How to log in</li>
          <li>Password requirements</li>
          <li>How to log out securely</li>
        </ul>

        <h2 className="cardH2">How to Play</h2>
        <ul className="bullets">
          <li>How to start the game</li>
          <li>How scoring works</li>
          <li>How difficulty increases</li>
          <li>How long each session lasts</li>
        </ul>

        <h2 className="cardH2">Viewing Results</h2>
        <ul className="bullets">
          <li>How to access history</li>
          <li>What each column means</li>
          <li>How performance is tracked</li>
        </ul>

        <h2 className="cardH2">Security Information</h2>
        <ul className="bullets">
          <li>Passwords are securely hashed</li>
          <li>Only authenticated users can access their data</li>
          <li>Reminder to log out on shared computers</li>
        </ul>
      </section>
    </div>
  )
}