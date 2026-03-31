const ProjectsPortal = ({ projects, visible }) => {
  if (!projects.length || !visible) return null;

  return (
    <div className="project-portal">
      <p className="project-portal-hint">PROJECTS • Press Esc to close</p>
      <div className="project-rail">
        {projects.map((project) => (
          <article key={project.id} className="project-card">
            <h3 className="text-base font-semibold break-all leading-tight">{project.name}</h3>
            <p className="mt-2 text-xs opacity-80">{project.description}</p>
            <div className="mt-3 text-xs opacity-70">
              <span>{project.language}</span> · <span>★ {project.stars}</span>
            </div>
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs underline"
            >
              Open on GitHub
            </a>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ProjectsPortal;
