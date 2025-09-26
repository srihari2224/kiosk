import "./Navbar.css"
import logo from "../assets/logo.png"

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <img src={logo}></img>
          
        </div>

      
      </div>
    </nav>
  )
}

export default Navbar
