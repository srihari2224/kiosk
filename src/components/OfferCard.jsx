import "./OfferCard.css"

export default function OfferCard() {
  return (
    <div className="offer-card">
      <div className="offer-label">
        <span
          className="offer-label-dot"
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "linear-gradient(90deg, #34d399 0%, #10b981 100%)",
            marginRight: "8px",
            boxShadow: "0 0 8px 2px #34d399",
            animation: "liveDotPulse 1.2s infinite"
          }}
        ></span>
        <span style={{ color: "blue" ,fontSize:"20px" ,fontWeight:"600" }}> LIMITED TIME OFFER</span>
      </div>

      <h3 className="offer-title">
        Print <em>Faster</em>
        <br />
        with <span className="offer-title-acc">Canvas UI Pro</span>
      </h3>

      <p className="offer-sub">
        
      </p>

      <div className="offer-bullets">
        <div className="offer-bullet">
          <div className="bullet-left">
            <span className="check" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>

            <div className="bullet-text">
              <div className="bullet-title">Black N White</div>
              <div className="bullet-sub">Single Side</div>
            </div>
          </div>

          <div className="offer-price">
            <div className="offer-price-amount">₹2</div>
            <div className="offer-price-once">only</div>
          </div>
        </div>

        <div className="offer-bullet">
          <div className="bullet-left">
            <span className="check" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>

            <div className="bullet-text">
              <div className="bullet-title">Black N White</div>
              <div className="bullet-sub">Double Side</div>
            </div>
          </div>

          <div className="offer-price">
            <div className="offer-price-amount">₹3</div>
            <div className="offer-price-once">only</div>
          </div>
        </div>

        <div className="offer-bullet">
          <div className="bullet-left">
            <span className="check" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>

            <div className="bullet-text">
              <div className="bullet-title">Color</div>
              <div className="bullet-sub">Single Side</div>
            </div>
          </div>

          <div className="offer-price">
            <div className="offer-price-amount">₹8</div>
            <div className="offer-price-once">only</div>
          </div>
        </div>

        <div className="offer-bullet">
          <div className="bullet-left">
            <span className="check" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>

            <div className="bullet-text">
              <div className="bullet-title">Color</div>
              <div className="bullet-sub">Double Side</div>
            </div>
          </div>

          <div className="offer-price">
            <div className="offer-price-amount">₹16</div>
            <div className="offer-price-once">only</div>
          </div>
        </div>
      </div>

      <button className="offer-cta" type="button">
        Scan The QR CODE
      </button>

      <div className="offer-trust">Built For NITC Students</div>
    </div>
  )
}
