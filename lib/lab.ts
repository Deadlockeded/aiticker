import type { MarketCard } from "./cards";
import { notifyStore } from "./binder";

/**
 * Draft-your-lab scoring. Team rating = average member rating + synergy
 * bonuses from an explicit link map (org alumni, rivalry participants,
 * moment casts) — deterministic and explainable.
 */

export const LAB_SIZE = 5;
export const MAX_LABS = 3;

/** org/company card id -> ids considered "theirs" (alumni, founders). */
const COMPANY_LINKS: Record<string, string[]> = {
  openai: ["sam-altman", "greg-brockman", "ilya-sutskever", "andrej-karpathy", "john-schulman", "mira-murati", "alec-radford", "jakub-pachocki", "wojciech-zaremba", "mark-chen", "noam-brown", "jan-leike", "jason-wei", "aditya-ramesh", "bill-peebles", "tim-brooks", "barret-zoph", "lilian-weng"],
  anthropic: ["dario-amodei", "daniela-amodei", "jared-kaplan", "chris-olah", "jan-leike", "tom-brown", "jack-clark"],
  "google-deepmind": ["demis-hassabis", "david-silver", "oriol-vinyals", "koray-kavukcuoglu", "shane-legg", "alex-graves", "volodymyr-mnih", "noam-shazeer", "ian-goodfellow", "jeff-dean", "quoc-le", "mustafa-suleyman"],
  "meta-ai": ["yann-lecun", "joelle-pineau", "soumith-chintala", "ross-girshick", "kaiming-he", "alexandr-wang"],
  nvidia: ["jim-fan"],
  mistral: ["arthur-mensch", "guillaume-lample"],
  "hugging-face": ["clem-delangue", "thomas-wolf"],
  cohere: ["aidan-gomez", "sara-hooker"],
  perplexity: ["aravind-srinivas"],
  "tesla-ai": ["andrej-karpathy"],
  "scale-ai": ["alexandr-wang"],
  deepseek: ["liang-wenfeng"],
  "safe-superintelligence": ["ilya-sutskever"],
  "thinking-machines": ["mira-murati", "john-schulman"],
  "sakana-ai": ["llion-jones", "david-ha"],
  "character-ai": ["noam-shazeer"],
  "world-labs": ["fei-fei-li"],
};

/** moment id -> cast; a matching member scores the "you were there" bonus. */
const MOMENT_LINKS: Record<string, string[]> = {
  "the-board-weekend": ["sam-altman", "ilya-sutskever", "greg-brockman", "mira-murati", "openai"],
  "deepseek-monday": ["liang-wenfeng", "deepseek", "nvidia"],
  "attention-is-all-you-need": ["ashish-vaswani", "noam-shazeer", "niki-parmar", "jakob-uszkoreit", "llion-jones", "aidan-gomez", "lukasz-kaiser", "illia-polosukhin", "google-deepmind"],
  "alphago-move-37": ["demis-hassabis", "david-silver", "google-deepmind"],
  "the-7t-ask": ["sam-altman", "openai", "tsmc", "nvidia"],
  "ghibli-day": ["openai", "sam-altman"],
  "the-pause-letter": ["eliezer-yudkowsky", "yoshua-bengio", "gary-marcus"],
  "transformer-eight-reunion": ["ashish-vaswani", "noam-shazeer", "niki-parmar", "jakob-uszkoreit", "llion-jones", "aidan-gomez", "lukasz-kaiser", "illia-polosukhin", "nvidia"],
};

/** rivalry id -> participants on either side ("chaos synergy"). */
const RIVALRY_LINKS: Record<string, string[]> = {
  "musk-vs-altman": ["xai", "openai", "sam-altman"],
  "google-vs-openai": ["google-deepmind", "openai", "sam-altman", "demis-hassabis"],
  "lecun-vs-doomers": ["yann-lecun", "eliezer-yudkowsky", "yoshua-bengio", "geoffrey-hinton"],
  "open-vs-closed": ["meta-ai", "mistral", "hugging-face", "deepseek", "openai", "anthropic"],
};

export interface LabBonus {
  label: string;
  points: number;
}

export function scoreLab(members: MarketCard[]): {
  teamRating: number;
  base: number;
  bonuses: LabBonus[];
} {
  const ids = new Set(members.map((m) => m.id));
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const bonuses: LabBonus[] = [];

  // same-org pairs: any two members linked to the same company (the company
  // card itself counts as linked)
  for (const [companyId, alumni] of Object.entries(COMPANY_LINKS)) {
    const linked = [companyId, ...alumni].filter((id) => ids.has(id));
    if (linked.length >= 2) {
      bonuses.push({
        label: `${nameOf(companyId)} mafia ×${linked.length}`,
        points: 3 * (linked.length - 1),
      });
    }
  }

  for (const member of members) {
    if (member.type === "rivalry") {
      const cast = RIVALRY_LINKS[member.id] ?? [];
      if (cast.some((id) => ids.has(id))) {
        bonuses.push({ label: `Chaos synergy: ${member.name}`, points: 5 });
      }
    }
    if (member.type === "moment") {
      const cast = MOMENT_LINKS[member.id] ?? [];
      if (cast.some((id) => ids.has(id))) {
        bonuses.push({ label: `You were there: ${member.name}`, points: 4 });
      }
    }
  }

  const base =
    members.length === 0
      ? 0
      : members.reduce((s, m) => s + m.rating, 0) / members.length;
  const bonusTotal = Math.min(
    15,
    bonuses.reduce((s, b) => s + b.points, 0),
  );
  return {
    base: Math.round(base),
    bonuses,
    teamRating: Math.min(99, Math.round(base + bonusTotal)),
  };
}

// ---- saved labs ----

const LABS_KEY = "ai-index:labs:v1";

export interface SavedLab {
  name: string;
  ids: string[];
  savedAt: string;
}

export function getLabsSnapshot(): string {
  return localStorage.getItem(LABS_KEY) ?? "[]";
}

export function parseLabs(raw: string): SavedLab[] {
  try {
    const labs = JSON.parse(raw) as SavedLab[];
    return Array.isArray(labs) ? labs : [];
  } catch {
    return [];
  }
}

export function saveLab(lab: SavedLab): SavedLab[] {
  const labs = [lab, ...parseLabs(getLabsSnapshot()).filter((l) => l.name !== lab.name)].slice(0, MAX_LABS);
  localStorage.setItem(LABS_KEY, JSON.stringify(labs));
  notifyStore();
  return labs;
}

export function deleteLab(name: string): SavedLab[] {
  const labs = parseLabs(getLabsSnapshot()).filter((l) => l.name !== name);
  localStorage.setItem(LABS_KEY, JSON.stringify(labs));
  notifyStore();
  return labs;
}
