import React from "react"
import { useNavigate } from "react-router-dom"

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  const buttonStyle = {
    backgroundColor: "#0d6efd",
    color: "#fff",
    padding: "10px 16px",
    border: "none",
    borderRadius: "20px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(13,110,253,0.15)",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transition: "background-color 150ms ease, transform 100ms ease, box-shadow 150ms ease",
  }

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "40px auto", color: "#111" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>Privacy Policy</h1>
        <button
          style={buttonStyle}
          className="close-btn"
          aria-label="Go back"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>

      <style>{`
        .close-btn:focus { outline: 3px solid rgba(13,110,253,0.18); outline-offset: 2px; }
        .close-btn:hover { background-color: #0b5ed7; transform: translateY(-2px); box-shadow: 0 10px 24px rgba(11,94,215,0.18); }
        .close-btn:active { transform: translateY(0) scale(0.99); box-shadow: 0 6px 14px rgba(11,94,215,0.12); }
      `}</style>

      <section>
        <h2>1. Introduction</h2>
        <p>
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
          services.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To authenticate and verify your identity using Google Sign-In.</li>
          <li>To manage file uploads and printing requests.</li>
          <li>To provide customer support and resolve issues.</li>
          <li>To improve the performance and reliability of our service.</li>
        </ul>

        <h2>3. Data Sharing & Disclosure</h2>
        <p>
          We <strong>do not sell or share</strong> your personal data with third parties for their marketing purposes.
          Your data is only used internally to provide and improve the service.
        </p>

        <h2>4. Data Storage & Security</h2>
        <p>
          All data is stored securely with industry-standard encryption. Access to personal information is restricted to
          authorized personnel only.
        </p>

        <h2>5. Data Retention & Deletion</h2>
        <p>
          We retain your account data only as long as necessary to provide our service. You can request deletion of your
          account and all related data anytime by contacting us at{" "}
          <a href="mailto:msrihari2224@gmail.com">msrihari2224@gmail.com</a>.
        </p>

        <h2>6. Third-Party Services</h2>
        <p>
          Our app uses Google APIs for authentication and may use payment processors. By using our app, you agree to the
          privacy policies and terms of those third parties in addition to ours.
        </p>

        <h2>7. Children's Privacy</h2>
        <p>Our service is not directed at children under 13. We do not knowingly collect information from children.</p>

        <h2>8. Updates to this Policy</h2>
        <p>We may update this Privacy Policy occasionally. Significant changes will be announced on this page.</p>

        <h2>9. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please email us at{" "}
          <a href="mailto:msrihari2224@gmail.com">msrihari2224@gmail.com</a>.
        </p>
      </section>
    </div>
  )
}

export default PrivacyPolicy
