let stars: Promise<Map<string, number>> | undefined;

// Star counts for every public repo of the owner, fetched once per build.
// The page still builds without them if GitHub is unreachable or rate limited.
export function getStars(owner = "ceifa") {
  stars ??= (async () => {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ceifa-website",
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    try {
      const response = await fetch(
        `https://api.github.com/users/${owner}/repos?per_page=100&type=owner`,
        { headers },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const repos: { full_name: string; stargazers_count: number }[] = await response.json();
      return new Map(repos.map((repo) => [repo.full_name, repo.stargazers_count]));
    } catch (error) {
      console.warn(`[github] building without star counts: ${(error as Error).message}`);
      return new Map();
    }
  })();
  return stars;
}
