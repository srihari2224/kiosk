import "./ProjectCards.css"

const ProjectCards = () => {
  const projects = [
    {
      id: 1,
      title: "TaskFlow Pro",
      description: "AI-powered task management platform for teams",
      image: "/task-management-dashboard-dark-theme.jpg",
      link: "#",
      category: "Productivity",
    },
    {
      id: 2,
      title: "ShopConnect",
      description: "Multi-vendor marketplace with AI recommendations",
      image: "/ecommerce-marketplace-interface.jpg",
      link: "#",
      category: "E-commerce",
    },
    {
      id: 3,
      title: "ContentAI Studio",
      description: "AI-powered content creation platform for marketers",
      image: "/content-creation-dashboard-interface.jpg",
      link: "#",
      category: "AI Tools",
    },
  ]

  return (
    <section className="projects-section">
      <div className="projects-container">
        <div className="projects-header">
          <h2 className="projects-title">
            <span className="title-main">Explore Our</span>
            <span className="title-gradient">Latest Projects</span>
          </h2>
          <p className="projects-description">
            From AI-driven automation to custom marketplaces, our work helps businesses scale smarter. Explore some of
            the platforms, tools, and solutions we've created for our clients and ourselves.
          </p>
        </div>

        {/* <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-image">
                <img src={project.image || "/placeholder.svg"} alt={project.title} className="project-img" />
                <div className="project-overlay">
                  <div className="project-category">{project.category}</div>
                </div>
              </div>
              <div className="project-content">
                <h3 className="project-title">{project.title}</h3>
                <p className="project-description">{project.description}</p>
                <a href={project.link} className="project-link">
                  <span>View Project</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div> */}

        
        




      </div>
    </section>
  )
}

export default ProjectCards
