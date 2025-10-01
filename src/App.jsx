import React from "react"
import { Routes, Route } from "react-router-dom"
import FileTransferPage from "./components/FileTransferPage"
import IntegratedFilePage from "./components/IntegratedFilePage"
import TermsOfService from "./components/TermsOfService"
import PrivacyPolicy from "./components/PrivacyPolicy"
import RefundPolicy from "./components/RefundPolicy"
import "./App.css"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FileTransferPage />} />
      <Route path="/integrated-files" element={<IntegratedFilePage />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
    </Routes>
  )
}
