import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.jsx"
import "./styles.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Router is mounted once at the app root so pages can use navigation hooks anywhere. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
