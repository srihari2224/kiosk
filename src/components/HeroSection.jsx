"use client"

import { useState, useEffect } from "react"
import QRCodeLib from "qrcode"
import "./HeroSection.css"

const HeroSection = ({ sessionId, onGetStarted, onRefreshSession }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  useEffect(() => {
    if (sessionId) generateQRCode(sessionId)
  }, [sessionId])

  const generateQRCode = async (id) => {
    try {
      const qrUrl = `https://innvera.vercel.app/?session=${id}`
      const dataUrl = await QRCodeLib.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
      setQrCodeUrl(dataUrl)
    } catch (err) {
      console.error("QR generation error:", err)
      setQrCodeUrl("")
    }
  }

  const handleGetStarted = async () => {
    setIsLoading(true)
    try {
      if (onGetStarted) {
        await onGetStarted()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshSession = () => {
    if (onRefreshSession) onRefreshSession()
  }

  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="title-main">Print-IT</span>
              <span className="title-gradient">Self Service</span>
              <span className="title-main">kiosk</span>
            </h1>
            <p className="hero-description">
              We build high-quality, scalable platforms—client portals, marketplaces, AI automations, and SaaS—using the best tools for the job, no shortcuts.
            </p>

            <div className="hero-actions">
              <button
                className={`hero-button ${isLoading ? "loading" : ""}`}
                onClick={handleGetStarted}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  "Get Started"
                )}
              </button>

              {sessionId && (
                <div className="session-info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="session-label">Session ID:</span>
                  <span className="session-identity">{sessionId}</span>
                  <button className="refresh-button" onClick={handleRefreshSession}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hero-visual">
            <div className="qr-code-container">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="session qr" className="qr-code-image" />
              ) : (
                <div className="qr-placeholder">Generating QR...</div>
              )}
              <div className="gradient-scan" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      

    </section>
  )
}

export default HeroSection
