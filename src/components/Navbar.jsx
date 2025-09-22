import "./Navbar.css"

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo">
            <div className="logo-circle">
              <div className="logo-inner"></div>
            </div>
            <span className="brand-text">AUTOMATIC</span>
          </div>
        </div>

        <div className="navbar-menu">
          <div className="navbar-item dropdown">
            <span>Resources</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </div>
          <div className="navbar-item">Portfolio</div>
          <div className="navbar-item">Start Project</div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
