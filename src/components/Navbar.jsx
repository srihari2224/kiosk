import "./Navbar.css"
import stars from "../assets/stars.mp4"

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <video 
            src={stars} 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="navbar-video"
          ></video>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
