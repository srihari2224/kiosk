"use client"

import { useState, useEffect } from "react"
import QRCode from "qrcode"
import "./HeroSection.css"

const HeroSection = ({ sessionId, onGetStarted }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  useEffect(() => {
    if (sessionId) {
      generateQRCode(sessionId)
    }
  }, [sessionId])

  const generateQRCode = (sessionId) => {
    const qrUrl = `https://innvera.vercel.app/?session=${sessionId}`

    QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        setQrCodeUrl(url)
      })
      .catch((err) => {
        console.error("Error generating QR code:", err)
      })
  }

  const handleGetStarted = async () => {
    if (onGetStarted) {
      await onGetStarted()
    }
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
              We build high-quality, scalable platforms—client portals, marketplaces, AI automations, and SaaS—using the
              best tools for the job, no shortcuts.
            </p>
            <button className="hero-button" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>
          <div className="hero-visual">
            <div className="qr-code-container">
              {qrCodeUrl ? (
                <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code for file upload" className="qr-code-image" />
              ) : (
                <div className="qr-placeholder">
                  <div className="qr-skeleton"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
