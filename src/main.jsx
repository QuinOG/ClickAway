import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.jsx"
import AppErrorBoundary from "./components/AppErrorBoundary.jsx"
import { FeedbackPreferencesProvider } from "./app/FeedbackPreferencesContext.jsx"
import "./styles/app.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
  <FeedbackPreferencesProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </FeedbackPreferencesProvider>
  </AppErrorBoundary>
)
