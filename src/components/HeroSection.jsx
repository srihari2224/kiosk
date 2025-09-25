"use client"

import { useState, useEffect } from "react"
import QRCodeLib from "qrcode"
import "./HeroSection.css"
import OfferCard from "./OfferCard"

const HeroSection = ({ sessionId, onGetStarted, onRefreshSession, onProcess }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [processingOpen, setProcessingOpen] = useState(false)
  const [processingStage, setProcessingStage] = useState("idle") // 'idle' | 'fetching' | 'ready'
  const [sessionFiles, setSessionFiles] = useState([])

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
    setProcessingOpen(true)
    setProcessingStage("fetching")
    setSessionFiles([])

    try {
      // onGetStarted should perform the session creation + file fetch/download work
      // and return an object like { files: [...] } or an array of files.
      const result = onGetStarted ? await onGetStarted() : null

      const files = Array.isArray(result) ? result : result?.files ?? []
      setSessionFiles(files)

      // background work finished
      setProcessingStage("ready")
    } catch (err) {
      console.error("Get started error:", err)
      setProcessingStage("idle")
      // keep modal open to show error or allow retry
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessClick = () => {
    // call external handler if provided
    if (onProcess) {
      onProcess({ sessionId, files: sessionFiles })
      return
    }

    // default navigation fallback
    window.location.href = `/print?session=${encodeURIComponent(sessionId)}`
  }

  const handleCloseProcessing = () => {
    setProcessingOpen(false)
    setProcessingStage("idle")
  }

  const handleRefreshSession = () => {
    if (onRefreshSession) onRefreshSession()
  }

  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-row">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                <span className="title-main">Print-IT</span>
                <span className="title-gradient">Self Service</span>
                <span className="title-main">kiosk</span>
              </h1>

              <div className="hero-actions">
                <button
                  className={`hero-button ${isLoading ? "loading" : ""}`}
                  onClick={handleGetStarted}
                  disabled={isLoading}
                >
                  Get Started
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
                <div className="qr-frame" aria-hidden={qrCodeUrl ? "false" : "true"}>
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl || "/placeholder.svg"} alt="session qr" className="qr-code-image" />
                  ) : (
                    <div className="qr-placeholder">Generating QR...</div>
                  )}

                  {/* decorative corner markers */}
                  <span className="qr-corner tl" />
                  <span className="qr-corner tr" />
                  <span className="qr-corner bl" />
                  <span className="qr-corner br" />
                </div>
                <div className="gradient-scan" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="offer-card-wrapper">
            <OfferCard />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="site-loading-overlay" role="status" aria-live="polite">
          <div className="site-loading-box">
            <div className="site-spinner" />
            <p>Preparing your session…</p>
          </div>
        </div>
      )}

      {/* The processing overlay shown while the session fetch/download happens */}
      {processingOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            background: "rgba(3,6,10,0.65)",
            padding: 20,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              width: 620,
              maxWidth: "100%",
              background: "#070807",
              borderRadius: 12,
              padding: 18,
              color: "#e6eefc",
              border: "1px solid rgba(255,255,255,0.04)",
              boxShadow: "0 12px 40px rgba(2,6,23,0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    background: "#0b1220",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <div className="site-spinner" style={{ width: 28, height: 28 }} />
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: 24 }}>Processing session files</div>
                  <div style={{ color: "#98a3b8", marginTop: 6, fontSize: 13 }}>
                    {processingStage === "fetching" ? "Fetching files from the session and S3…" : "Files ready to process"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCloseProcessing}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9aa7c7",
                  cursor: "pointer",
                  fontSize: 20,
                }}
                aria-label="Close processing"
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              {processingStage === "fetching" && (
                <div style={{ color: "#bfc8d6", fontSize: 13 }}>
                  The app is checking the session folder and downloading missing files. This may take a few seconds.
                </div>
              )}

              {processingStage === "ready" && (
                <>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {sessionFiles.length > 0 ? (
                      sessionFiles.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 10px",
                            background: "#06060a",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.02)",
                            color: "#dbe8ff",
                            fontSize: 20,
                          }}
                        >
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>
                            {f.name || f.filename || f.key || f}
                          </div>
                          <div style={{ color: "#98a3b8", fontSize: 12 }}>{f.size ? `${Math.round(f.size / 1024)} KB` : ""}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "#9aa7c7", fontSize: 13 }}>No files were returned for this session.</div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                    <button
                      onClick={handleCloseProcessing}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.06);",
                        color: "#000000ff",
                        padding: "8px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 30,
                      }}
                    >
                      Close
                    </button>

                    {/* Only show Process files when we actually have files */}
                    {sessionFiles && sessionFiles.length > 0 && (
                      <button
                        onClick={handleProcessClick}
                        style={{
                          background: "#007bff",
                          border: "none",
                          color: "#fff",
                          padding: "8px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontSize: 30,
                          boxShadow: "0 6px 18px rgba(0,123,255,0.2)",
                        }}
                      >
                        Process files
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default HeroSection
