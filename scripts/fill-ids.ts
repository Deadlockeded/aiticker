/**
 * One-off: resolve + verify data-pipeline ids for every card.
 *   npx tsx scripts/fill-ids.ts
 *
 * - wikipediaSlug: candidate = override ?? Name_With_Underscores, verified in
 *   batches of 50 via the Action API (redirects followed; disambig rejected).
 * - openalexId: author search per engineer (keyless, mailto param), accepted
 *   only when the top hit's name loosely matches and works_count >= 20.
 * - githubOrg/githubUser/hfOrg: curated maps (verified by the dry run).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const CARDS_PATH = path.join(process.cwd(), "data", "cards.json");
const MAILTO = "peepatma@gmail.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const WIKI_OVERRIDES: Record<string, string | null> = {
  // companies with non-obvious titles
  "meta-ai": "Meta_AI", xai: "XAI_(company)", "01-ai": "01.AI",
  qwen: "Qwen", "baidu-ernie": "Ernie_Bot", "bytedance-seed": "ByteDance",
  "tencent-hunyuan": "Tencent", "ibm-watsonx": "Watsonx",
  "microsoft-ai": "Microsoft", "amazon-ai": "Amazon_Web_Services",
  "apple-intelligence": "Apple_Intelligence", "tesla-ai": "Tesla,_Inc.",
  "scale-ai": "Scale_AI", cursor: "Cursor_(code_editor)",
  "1x": "1X_(company)", "safe-superintelligence": "Safe_Superintelligence",
  "thinking-machines": "Thinking_Machines_Lab", "character-ai": "Character.ai",
  "stability-ai": "Stability_AI", "inflection-ai": "Inflection_AI",
  mistral: "Mistral_AI", perplexity: "Perplexity_AI", deepseek: "DeepSeek",
  "moonshot-ai": "Moonshot_AI", minimax: "MiniMax_(company)",
  "zhipu-ai": "Zhipu_AI", figure: "Figure_AI",
  "lambda-labs": "Lambda_(company)", palantir: "Palantir_Technologies",
  arm: "Arm_Holdings", "recursion": "Recursion_Pharmaceuticals",
  runway: "Runway_(company)", suno: "Suno_AI",
  "weights-biases": "Weights_%26_Biases", cognition: "Cognition_AI",
  "ai21-labs": "AI21_Labs", "luma-ai": "Luma_Labs",
  "pinecone": "Pinecone_(vector_database)", "sakana-ai": "Sakana_AI",
  "world-labs": "World_Labs", "boston-dynamics": "Boston_Dynamics",
  "agility-robotics": "Agility_Robotics", "physical-intelligence": "Physical_Intelligence_(company)",
  "applied-intuition": "Applied_Intuition", "black-forest-labs": "Black_Forest_Labs",
  "together-ai": "Together_AI", "hugging-face": "Hugging_Face",
  "google-deepmind": "Google_DeepMind", "elevenlabs": "ElevenLabs",
  // engineers with disambiguated / non-obvious titles
  "david-silver": "David_Silver_(computer_scientist)",
  "alex-graves": "Alex_Graves_(computer_scientist)",
  "jeremy-howard": "Jeremy_Howard_(entrepreneur)",
  "paul-christiano": "Paul_Christiano_(researcher)",
  "richard-sutton": "Richard_S._Sutton", "stuart-russell": "Stuart_J._Russell",
  "christopher-manning": "Christopher_D._Manning",
  "alexei-efros": "Alexei_A._Efros", "quoc-le": "Quoc_V._Le",
  "chris-olah": "Christopher_Olah", "lukasz-kaiser": "Łukasz_Kaiser",
  "clem-delangue": "Clément_Delangue",
  "juergen-schmidhuber": "Jürgen_Schmidhuber",
  "francois-chollet": "François_Chollet",
  "christopher-re": "Christopher_Ré",
  // known-ambiguous names: never guess
  "tom-brown": null, "jack-clark": null, "mark-chen": null,
  "tim-brooks": null, "bill-peebles": null, "david-ha": null,
  // moments/rivalries: skip
};

const GITHUB_ORGS: Record<string, string> = {
  openai: "openai", anthropic: "anthropics", "google-deepmind": "google-deepmind",
  "meta-ai": "facebookresearch", mistral: "mistralai", "hugging-face": "huggingface",
  nvidia: "NVIDIA", "microsoft-ai": "microsoft", xai: "xai-org",
  deepseek: "deepseek-ai", qwen: "QwenLM", cohere: "cohere-ai",
  databricks: "databricks", "stability-ai": "Stability-AI",
  "together-ai": "togethercomputer", langchain: "langchain-ai",
  llamaindex: "run-llama", weaviate: "weaviate", pinecone: "pinecone-io",
  replicate: "replicate", modal: "modal-labs", groq: "groq",
  "ai21-labs": "AI21Labs", sourcegraph: "sourcegraph", replit: "replit",
  tenstorrent: "tenstorrent", "zhipu-ai": "THUDM", "moonshot-ai": "MoonshotAI",
  "01-ai": "01-ai", "sakana-ai": "SakanaAI", kyutai: "kyutai-labs",
  "black-forest-labs": "black-forest-labs", "fireworks-ai": "fw-ai",
  "scale-ai": "scaleapi", elevenlabs: "elevenlabs",
};

const GITHUB_USERS: Record<string, string> = {
  "andrej-karpathy": "karpathy", "george-hotz": "geohot",
  "francois-chollet": "fchollet", "soumith-chintala": "soumith",
  "david-ha": "hardmaru", "tri-dao": "tridao", "greg-brockman": "gdb",
  "chris-lattner": "lattner", "lilian-weng": "lilianweng",
  "jeremy-howard": "jph00", "wojciech-zaremba": "wojzaremba",
};

const HF_ORGS: Record<string, string> = {
  openai: "openai", "meta-ai": "meta-llama", mistral: "mistralai",
  "google-deepmind": "google", deepseek: "deepseek-ai", qwen: "Qwen",
  "microsoft-ai": "microsoft", nvidia: "nvidia", "stability-ai": "stabilityai",
  "black-forest-labs": "black-forest-labs", cohere: "CohereLabs",
  "ai21-labs": "ai21labs", "zhipu-ai": "THUDM", "moonshot-ai": "moonshotai",
  "minimax": "MiniMaxAI", "01-ai": "01-ai", "sakana-ai": "SakanaAI",
  kyutai: "kyutai", "liquid-ai": "LiquidAI", reka: "RekaAI",
  "hugging-face": "HuggingFaceH4", "bytedance-seed": "ByteDance-Seed",
  "tencent-hunyuan": "tencent", "ibm-watsonx": "ibm-granite",
};

interface SeedCard {
  id: string;
  name: string;
  type: string;
  wikipediaSlug?: string;
  openalexId?: string;
  githubOrg?: string;
  githubUser?: string;
  hfOrg?: string;
  [k: string]: unknown;
}

async function verifyWikiSlugs(candidates: Map<string, string>): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const entries = [...candidates.entries()];
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50);
    const titles = batch.map(([, t]) => decodeURIComponent(t.replace(/_/g, " ")));
    const params = new URLSearchParams({
      action: "query", format: "json", redirects: "1",
      prop: "pageprops", ppprop: "disambiguation",
      titles: titles.join("|"),
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": `aiticker-pipeline/1.0 (${MAILTO})` },
    });
    if (!res.ok) {
      console.log(`  wiki batch HTTP ${res.status}, skipping batch`);
      continue;
    }
    const data = (await res.json()) as {
      query: {
        normalized?: { from: string; to: string }[];
        redirects?: { from: string; to: string }[];
        pages: Record<string, { title: string; missing?: string; pageprops?: { disambiguation?: string } }>;
      };
    };
    // map final titles back to the requested ones
    const back = new Map<string, string>();
    for (const n of data.query.normalized ?? []) back.set(n.to, n.from);
    for (const r of data.query.redirects ?? []) {
      back.set(r.to, back.get(r.from) ?? r.from);
    }
    for (const page of Object.values(data.query.pages)) {
      if (page.missing !== undefined || page.pageprops?.disambiguation !== undefined) continue;
      const requested = back.get(page.title) ?? page.title;
      const hit = batch.find(
        ([, t]) => decodeURIComponent(t.replace(/_/g, " ")).toLowerCase() === requested.toLowerCase(),
      );
      // store the FINAL title (post-redirect) — pageviews wants the real page
      if (hit) resolved.set(hit[0], page.title.replace(/ /g, "_"));
    }
    await sleep(300);
  }
  return resolved;
}

async function findOpenAlexId(name: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      search: name, "per-page": "1", mailto: MAILTO,
    });
    const res = await fetch(`https://api.openalex.org/authors?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results: { id: string; display_name: string; works_count: number }[];
    };
    const hit = data.results?.[0];
    if (!hit || hit.works_count < 20) return null;
    const last = name.split(" ").pop()!.toLowerCase();
    if (!hit.display_name.toLowerCase().includes(last)) return null;
    return hit.id.replace("https://openalex.org/", "");
  } catch {
    return null;
  }
}

async function main() {
  const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8")) as SeedCard[];

  // wikipedia
  const candidates = new Map<string, string>();
  for (const card of cards) {
    if (card.type !== "company" && card.type !== "engineer") continue;
    const override = WIKI_OVERRIDES[card.id];
    if (override === null) continue;
    candidates.set(card.id, override ?? card.name.replace(/ /g, "_"));
  }
  console.log(`verifying ${candidates.size} wikipedia slugs…`);
  const slugs = await verifyWikiSlugs(candidates);
  console.log(`  resolved ${slugs.size}`);

  // openalex (engineers only)
  const engineers = cards.filter((c) => c.type === "engineer");
  console.log(`resolving openalex ids for ${engineers.length} engineers…`);
  let openalexFound = 0;
  for (const card of engineers) {
    const id = await findOpenAlexId(card.name);
    if (id) {
      card.openalexId = id;
      openalexFound++;
    }
    await sleep(150);
  }
  console.log(`  resolved ${openalexFound}`);

  for (const card of cards) {
    const slug = slugs.get(card.id);
    if (slug) card.wikipediaSlug = slug;
    if (GITHUB_ORGS[card.id]) card.githubOrg = GITHUB_ORGS[card.id];
    if (GITHUB_USERS[card.id]) card.githubUser = GITHUB_USERS[card.id];
    if (HF_ORGS[card.id]) card.hfOrg = HF_ORGS[card.id];
  }

  writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n");
  const counts = {
    wikipediaSlug: cards.filter((c) => c.wikipediaSlug).length,
    openalexId: cards.filter((c) => c.openalexId).length,
    githubOrg: cards.filter((c) => c.githubOrg).length,
    githubUser: cards.filter((c) => c.githubUser).length,
    hfOrg: cards.filter((c) => c.hfOrg).length,
  };
  console.log("id coverage:", counts);
}

main();
