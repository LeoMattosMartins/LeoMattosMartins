import translationsMap from '../data/translations_map.json';

const API_URL = 'https://api.github.com/users/LeoMattosMartins/repos?sort=updated&per_page=12';

export const fetchGitHubProjects = async (language = 'en-GB') => {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error('Unable to fetch repositories');
  }

  const repos = await response.json();
  const languageMap = translationsMap[language] ?? {};

  return repos
    .filter((repo) => !repo.fork)
    .slice(0, 8)
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language || 'N/A',
      description: languageMap[repo.name] || repo.description || 'No description provided.'
    }));
};
