import type { Card } from "../../lib/types";
import { fetchJson, MAILTO, type Source, type StatUpdate } from "./util";

interface AuthorResponse {
  cited_by_count: number;
  works_count: number;
  summary_stats?: { h_index?: number };
}

/** OpenAlex — keyless with a mailto. Slow-moving foundation stats. */
export const openalex: Source = {
  name: "openalex",
  applies: (card: Card) => Boolean(card.openalexId),
  async fetchFor(card: Card): Promise<StatUpdate> {
    const data = await fetchJson<AuthorResponse>(
      `https://api.openalex.org/authors/${card.openalexId}?mailto=${MAILTO}`,
    );
    return {
      citations: data.cited_by_count,
      hIndex: data.summary_stats?.h_index,
      works: data.works_count,
    };
  },
};
