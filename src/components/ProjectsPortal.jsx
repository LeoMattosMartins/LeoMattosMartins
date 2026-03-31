import { useTranslation } from 'react-i18next';

const ProjectsPortal = ({ projects, visible }) => {
  const { t } = useTranslation();

  if (!projects.length || !visible) return null;

  return (
    <div className="project-portal">
      <p className="project-portal-hint">{t('projects.portalHint')}</p>
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
              {t('projects.openOnGitHub')}
            </a>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ProjectsPortal;
