import type { Card } from "../../lib/types";
import { fetchJson, type Source, type StatUpdate } from "./util";

interface SearchResponse {
  nbHits: number;
}

/** Algolia HN Search — keyless. Quoted-name story mentions, trailing 7d. */
export const hackernews: Source = {
  name: "hackernews",
  applies: (card: Card) => card.type === "company" || card.type === "engineer",
  async fetchFor(card: Card): Promise<StatUpdate> {
    const since = Math.floor(Date.now() / 1000) - 7 * 86_400;
    const params = new URLSearchParams({
      query: `"${card.name}"`,
      tags: "story",
      numericFilters: `created_at_i>${since}`,
      hitsPerPage: "0",
    });
    const data = await fetchJson<SearchResponse>(
      `https://hn.algolia.com/api/v1/search?${params}`,
    );
    return { hnMentions7d: data.nbHits };
  },
};
