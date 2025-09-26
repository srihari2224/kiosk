import "./Navbar.css"
import logo from "../assets/logo.png" 

/**
 * Navbar component renders the top navigation bar with the brand logo and menu.
 */
const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">  
        <div className="navbar-brand">
          <img src={logo} alt="Logo" />
        </div>

        <div className="navbar-menu">
          <div className="navbar-item dropdown">
            
          </div>
          
        </div>
      </div>
    </nav>
  )
}

export default Navbar
