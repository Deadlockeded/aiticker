import type { Card } from "../../lib/types";
import { fetchJson, type Source, type StatUpdate } from "./util";

interface Model {
  downloads?: number;
  likes?: number;
}

/** Hugging Face Hub API — keyless. `downloads` is the trailing-30d count. */
export const huggingface: Source = {
  name: "huggingface",
  applies: (card: Card) => Boolean(card.hfOrg),
  async fetchFor(card: Card): Promise<StatUpdate> {
    const models = await fetchJson<Model[]>(
      `https://huggingface.co/api/models?author=${card.hfOrg}&sort=downloads&direction=-1&limit=50`,
    );
    return {
      hfDownloads30d: models.reduce((s, m) => s + (m.downloads ?? 0), 0),
      hfLikes: models.reduce((s, m) => s + (m.likes ?? 0), 0),
    };
  },
};
