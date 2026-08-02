import type { Card } from "../../lib/types";
import { fetchJson, type Source, type StatUpdate, utcDay } from "./util";

interface PageviewsResponse {
  items: { views: number }[];
}

/** Wikimedia Pageviews REST API — keyless. attention7d + delta vs prior 7d. */
export const wikipedia: Source = {
  name: "wikipedia",
  applies: (card: Card) => Boolean(card.wikipediaSlug),
  async fetchFor(card: Card): Promise<StatUpdate> {
    const slug = encodeURIComponent(card.wikipediaSlug!);
    // 14 full days ending yesterday (today's counts are incomplete)
    const url =
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/` +
      `en.wikipedia/all-access/user/${slug}/daily/${utcDay(-14)}/${utcDay(-1)}`;
    const data = await fetchJson<PageviewsResponse>(url);
    const views = data.items.map((i) => i.views);
    const recent = views.slice(-7).reduce((s, v) => s + v, 0);
    const prior = views.slice(0, -7).reduce((s, v) => s + v, 0);
    return {
      attention7d: recent,
      attentionDelta:
        prior > 0 ? Math.round(((recent - prior) / prior) * 1000) / 10 : 0,
    };
  },
};
