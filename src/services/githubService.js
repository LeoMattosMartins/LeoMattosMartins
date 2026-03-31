import translationsMap from '../data/translations_map.json';

const API_URL = 'https://api.github.com/users/LeoMattosMartins/repos?sort=updated&per_page=12';

const PROJECT_FALLBACKS = {
  'en-GB': {
    noLanguage: 'N/A',
    noDescription: 'No description provided.'
  },
  'pt-BR': {
    noLanguage: 'N/D',
    noDescription: 'Sem descrição disponível.'
  },
  'es-ES': {
    noLanguage: 'N/D',
    noDescription: 'Sin descripción disponible.'
  }
};

export const fetchGitHubProjects = async (language = 'en-GB') => {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error('Unable to fetch repositories');
  }

  const repos = await response.json();
  const languageMap = translationsMap[language] ?? {};
  const fallback = PROJECT_FALLBACKS[language] ?? PROJECT_FALLBACKS['en-GB'];

  return repos
    .filter((repo) => !repo.fork)
    .slice(0, 8)
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language || fallback.noLanguage,
      description: languageMap[repo.name] || repo.description || fallback.noDescription
    }));
};
