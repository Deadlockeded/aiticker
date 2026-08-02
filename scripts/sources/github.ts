import type { Card } from "../../lib/types";
import { fetchJson, type Source, type StatUpdate } from "./util";

interface Repo {
  stargazers_count: number;
}

interface User {
  followers: number;
}

function headers(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** GitHub REST — GITHUB_TOKEN is automatic in Actions, optional locally. */
export const github: Source = {
  name: "github",
  applies: (card: Card) => Boolean(card.githubOrg || card.githubUser),
  async fetchFor(card: Card): Promise<StatUpdate> {
    const owner = card.githubOrg ?? card.githubUser!;
    const repos = await fetchJson<Repo[]>(
      `https://api.github.com/users/${owner}/repos?per_page=100&sort=pushed`,
      headers(),
    );
    const stars = repos
      .map((r) => r.stargazers_count)
      .sort((a, b) => b - a)
      .slice(0, 10)
      .reduce((s, v) => s + v, 0);
    const update: StatUpdate = { stars };
    if (card.githubUser) {
      const user = await fetchJson<User>(
        `https://api.github.com/users/${card.githubUser}`,
        headers(),
      );
      update.ghFollowers = user.followers;
    }
    return update;
  },
};
