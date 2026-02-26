import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ isAuthed, children }) {
  return isAuthed ? children : <Navigate to="/login" replace />
}
