import React from "react"
import { useNavigate } from "react-router-dom"


const TermsOfService = () => {

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
    <div className="policy-page" style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="policy-content">
        <h1>Terms of Service</h1>
        <button
          style={buttonStyle}
          className="close-btn"
          aria-label="Go back"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        
        <h1>INNVERA TECHNOLOGY PRIVATE LIMITED</h1>

        <h1>Business Adress:</h1>
        <h2>22-8-152/A3 upadhyaya nagar 4th cross, Grand World Road, Tirupati,517501</h2>
        
        <p className="effective-date">Effective Date: September 13, 2025</p>

        <p>
          Welcome to <strong>INNVERA</strong>. These Terms of Service govern your use of our file upload and
          self-printing platform. By using our service, you agree to these terms.
        </p>


        <h2>1. Use of Service</h2>
        <ul>
          <li>You may use INNVERA only for lawful purposes.</li>
          <li>
            You agree not to upload or print content that violates laws, infringes copyrights, or spreads harmful
            material.
          </li>
          <li>We reserve the right to restrict access if we detect misuse.</li>
        </ul>

        <h2>2. Accounts</h2>
        <ul>
          <li>Google Sign-In is required to use our services.</li>
          <li>You are responsible for keeping your login credentials secure.</li>
          <li>We may suspend accounts engaged in suspicious or fraudulent activity.</li>
        </ul>

        <h2>3. Uploaded Content</h2>
        <ul>
          <li>Files you upload remain your property.</li>
          <li>We do not claim ownership of your content.</li>
          <li>Uploaded files may be processed temporarily for printing purposes and then deleted.</li>
        </ul>

        <h2>4. Payments & Services</h2>
        <ul>
          <li>Certain printing services may require payment.</li>
          <li>All transactions are final, and refunds are provided only in case of technical failures.</li>
        </ul>

        <h2>5. Service Availability</h2>
        <p>
          We strive to provide uninterrupted service but do not guarantee continuous uptime. We may modify, pause, or
          discontinue features at any time.
        </p>

        <h2>6. Limitation of Liability</h2>
        <p>
          INNVERA is not responsible for losses, damages, or disputes arising from use of the service, including but not
          limited to printing errors or data loss.
        </p>

        <h2>7. Changes to Terms</h2>
        <p>
          We may update these Terms of Service from time to time. Continued use of our service means you accept the
          updated terms.
        </p>

        <h2>8. Governing Law</h2>
        <p>These terms are governed by the laws of India. Disputes will be handled in local courts of jurisdiction.</p>

        <h2>9. Contact</h2>
        <p>
          For questions regarding these Terms, email us at{" "}
          <h2>innvera.co@gmail.com</h2>.
        </p>
      </div>
    </div>
  )
}

export default TermsOfService
