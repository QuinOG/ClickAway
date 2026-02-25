import { Outlet } from "react-router-dom"
import Navbar from "./Navbar.jsx"

export default function Layout({ isAuthed }) {
  return (
    <div className="appShell">
      {/* Navbar visibility/links are driven by auth state from App-level routing. */}
      <Navbar isAuthed={isAuthed} />
      <main className="mainContent">
        {/* Route outlet for page content. */}
        <Outlet />
      </main>
    </div>
  )
}
