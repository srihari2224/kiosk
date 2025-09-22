import { Routes, Route, Navigate } from "react-router-dom"
import FileTransferPage from "./components/FileTransferPage"
import IntegratedFilePage from "./components/IntegratedFilePage"
import "./App.css"

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to="/file-transfer" replace />} />
        <Route path="/file-transfer" element={<FileTransferPage />} />
        <Route path="/integrated-files" element={<IntegratedFilePage />} />
      </Routes>
    </div>
  )
}

export default App
