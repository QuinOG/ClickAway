import { Outlet } from "react-router-dom"
import Navbar from "./Navbar.jsx"

export default function Layout({ isAuthed }) {
  return (
    <div className="appShell">
      <Navbar isAuthed={isAuthed} />
      <main className="mainContent">
        <Outlet />
      </main>
    </div>
  )
}