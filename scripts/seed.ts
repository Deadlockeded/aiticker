/**
 * Series 1 seed generator. Two phases (run build, then assign — assign must
 * be a fresh process so lib/rating.ts recomputes maxes from the new JSON):
 *
 *   pnpm exec tsx scripts/seed.ts build    # merge curated data, fetch images
 *   pnpm exec tsx scripts/seed.ts assign   # ratings -> rarity/serial/stats
 *
 * Image rules (same as the original 20): engineers get freely-licensed
 * Wikimedia Commons portraits via the Wikipedia REST API (null when a person
 * has no page/photo or the plain title is ambiguous -> monogram fallback);
 * companies get their site favicon via Google's favicon service.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const CARDS_PATH = path.join(process.cwd(), "data", "cards.json");

// [id, name, domain, tagline, valuation $B, funding $B, headcount, models]
type CompanyRow = [string, string, string, string, number, number, number, number];
// [id, name, wikiTitle | null, tagline, citations, followers, impact, years]
type EngineerRow = [string, string, string | null, string, number, number, number, number];

const COMPANIES: CompanyRow[] = [
  ["microsoft-ai", "Microsoft AI", "microsoft.com", "Copilot everywhere, plus the OpenAI alliance", 3200, 1, 8000, 8],
  ["apple-intelligence", "Apple Intelligence", "apple.com", "On-device AI for two billion devices", 3400, 0.5, 3000, 4],
  ["amazon-ai", "Amazon AI", "amazon.com", "Bedrock, Nova and the AWS machine", 2300, 1, 10000, 6],
  ["ibm-watsonx", "IBM watsonx", "ibm.com", "Enterprise AI since Deep Blue", 250, 2, 3500, 5],
  ["tesla-ai", "Tesla AI", "tesla.com", "FSD and Optimus, trained on the fleet", 1100, 1, 2000, 3],
  ["scale-ai", "Scale AI", "scale.com", "The data engine behind frontier runs", 25, 1.6, 900, 1],
  ["databricks", "Databricks", "databricks.com", "The lakehouse, now with DBRX", 100, 14, 7000, 3],
  ["palantir", "Palantir", "palantir.com", "Ontologies meet LLMs in AIP", 280, 3, 3900, 2],
  ["amd", "AMD", "amd.com", "MI-series silicon chasing the crown", 340, 6, 26000, 1],
  ["intel", "Intel", "intel.com", "Gaudi and the x86 counterattack", 130, 8, 100000, 1],
  ["tsmc", "TSMC", "tsmc.com", "Every frontier chip is born here", 1100, 2, 77000, 0],
  ["broadcom", "Broadcom", "broadcom.com", "Custom TPUs and AI networking", 800, 3, 37000, 0],
  ["qualcomm", "Qualcomm", "qualcomm.com", "On-device AI in every pocket", 190, 2, 50000, 1],
  ["arm", "Arm", "arm.com", "The architecture under everything", 160, 1, 8000, 0],
  ["groq", "Groq", "groq.com", "LPUs serving tokens at ludicrous speed", 6, 1.7, 300, 0],
  ["cerebras", "Cerebras", "cerebras.ai", "Wafer-scale chips for giant models", 8, 1.5, 400, 2],
  ["sambanova", "SambaNova", "sambanova.ai", "Dataflow silicon for enterprise AI", 5, 1.1, 500, 1],
  ["tenstorrent", "Tenstorrent", "tenstorrent.com", "Jim Keller's open AI silicon", 2.6, 0.8, 600, 0],
  ["etched", "Etched", "etched.com", "Transformer-only ASICs, all-in bet", 1.5, 0.6, 100, 0],
  ["together-ai", "Together AI", "together.ai", "The open-model cloud", 3.3, 0.5, 200, 2],
  ["fireworks-ai", "Fireworks AI", "fireworks.ai", "Blazing inference for open models", 0.55, 0.08, 100, 1],
  ["modal", "Modal", "modal.com", "Serverless GPUs developers love", 0.7, 0.09, 60, 0],
  ["replicate", "Replicate", "replicate.com", "Any model, one API call", 0.35, 0.04, 50, 0],
  ["lambda-labs", "Lambda", "lambdalabs.com", "GPU cloud for deep learning", 2.5, 0.9, 350, 0],
  ["coreweave", "CoreWeave", "coreweave.com", "The GPU hyperscaler", 35, 12, 900, 0],
  ["nebius", "Nebius", "nebius.com", "AI cloud carved out of Yandex", 25, 0.7, 1300, 0],
  ["weights-biases", "Weights & Biases", "wandb.ai", "Experiment tracking for every lab", 1.7, 0.25, 300, 0],
  ["langchain", "LangChain", "langchain.com", "The agent-framework standard-bearer", 1.1, 0.26, 100, 0],
  ["llamaindex", "LlamaIndex", "llamaindex.ai", "RAG plumbing for enterprise data", 0.2, 0.05, 40, 0],
  ["pinecone", "Pinecone", "pinecone.io", "Managed vector search at scale", 0.75, 0.14, 200, 0],
  ["weaviate", "Weaviate", "weaviate.io", "Open-source vector database", 0.6, 0.07, 150, 0],
  ["elevenlabs", "ElevenLabs", "elevenlabs.io", "Voices indistinguishable from human", 6.6, 0.9, 400, 3],
  ["runway", "Runway", "runwayml.com", "Hollywood-grade generative video", 4, 0.8, 300, 4],
  ["pika", "Pika", "pika.art", "Playful text-to-video", 0.7, 0.14, 40, 2],
  ["luma-ai", "Luma AI", "lumalabs.ai", "Dream Machine and 3D worlds", 1, 0.17, 80, 2],
  ["midjourney", "Midjourney", "midjourney.com", "The artists' model, bootstrapped", 10, 0.01, 100, 6],
  ["stability-ai", "Stability AI", "stability.ai", "Stable Diffusion's chaotic parent", 1, 0.3, 150, 8],
  ["black-forest-labs", "Black Forest Labs", "blackforestlabs.ai", "FLUX — SD's creators strike back", 4, 0.3, 60, 3],
  ["ideogram", "Ideogram", "ideogram.ai", "Text rendering, finally solved", 1, 0.2, 50, 3],
  ["suno", "Suno", "suno.com", "Radio-ready songs from a prompt", 2.5, 0.13, 60, 3],
  ["character-ai", "Character.AI", "character.ai", "A billion chats with fictional friends", 2.5, 0.19, 150, 2],
  ["inflection-ai", "Inflection AI", "inflection.ai", "Pi and the great acqui-hire", 4, 1.5, 100, 2],
  ["cognition", "Cognition", "cognition.ai", "Devin, the AI software engineer", 10, 0.9, 300, 2],
  ["cursor", "Cursor", "cursor.com", "The AI-native code editor", 29, 1, 150, 1],
  ["poolside", "Poolside", "poolside.ai", "Frontier models for software", 3, 0.6, 100, 1],
  ["magic-dev", "Magic", "magic.dev", "100M-token context for code", 1.6, 0.5, 50, 1],
  ["sourcegraph", "Sourcegraph", "sourcegraph.com", "Cody and code intelligence", 2.6, 0.22, 200, 1],
  ["replit", "Replit", "replit.com", "Agentic coding for everyone", 3, 0.23, 300, 1],
  ["lovable", "Lovable", "lovable.dev", "Vibe-coding at record ARR", 1.8, 0.23, 100, 0],
  ["harvey", "Harvey", "harvey.ai", "The AI associate for elite law", 5, 0.8, 400, 1],
  ["glean", "Glean", "glean.com", "Enterprise search that works", 7.2, 0.6, 800, 1],
  ["sierra", "Sierra", "sierra.ai", "Bret Taylor's customer agents", 10, 0.6, 300, 1],
  ["synthesia", "Synthesia", "synthesia.io", "AI avatars for corporate video", 2.1, 0.33, 400, 2],
  ["heygen", "HeyGen", "heygen.com", "Avatar video gone viral", 0.5, 0.07, 100, 2],
  ["deepgram", "Deepgram", "deepgram.com", "Speech APIs for builders", 0.4, 0.09, 150, 2],
  ["cartesia", "Cartesia", "cartesia.ai", "Real-time voice on state-space models", 0.6, 0.09, 50, 2],
  ["figure", "Figure", "figure.ai", "Humanoids for the labor market", 39, 1.5, 300, 2],
  ["1x", "1X", "1x.tech", "Home humanoids with gentle hands", 1.3, 0.13, 200, 1],
  ["agility-robotics", "Agility Robotics", "agilityrobotics.com", "Digit clocks warehouse shifts", 1.8, 0.32, 300, 1],
  ["boston-dynamics", "Boston Dynamics", "bostondynamics.com", "Three decades of robot parkour", 4, 0.5, 800, 1],
  ["physical-intelligence", "Physical Intelligence", "physicalintelligence.company", "π0: general robot brains", 2.4, 0.47, 100, 1],
  ["waymo", "Waymo", "waymo.com", "Driverless miles in the millions", 45, 11, 2500, 2],
  ["wayve", "Wayve", "wayve.ai", "End-to-end driving, London-born", 3, 1.3, 500, 1],
  ["aurora", "Aurora", "aurora.tech", "Autonomous trucking corridors", 7, 3, 1700, 1],
  ["applied-intuition", "Applied Intuition", "appliedintuition.com", "Simulation for every AV program", 15, 1.1, 900, 0],
  ["deepl", "DeepL", "deepl.com", "Translation that beats the giants", 2, 0.42, 900, 2],
  ["writer", "Writer", "writer.com", "Full-stack enterprise genAI", 1.9, 0.33, 300, 3],
  ["abridge", "Abridge", "abridge.com", "Ambient clinical notes doctors trust", 2.8, 0.46, 300, 1],
  ["isomorphic-labs", "Isomorphic Labs", "isomorphiclabs.com", "AlphaFold spun into drug design", 3, 0.6, 300, 2],
  ["recursion", "Recursion", "recursion.com", "Industrialized drug discovery", 2.5, 1.5, 800, 2],
  ["evolutionaryscale", "EvolutionaryScale", "evolutionaryscale.ai", "ESM3 and programmable biology", 0.7, 0.14, 40, 2],
  ["ai21-labs", "AI21 Labs", "ai21.com", "Jamba and Israeli NLP roots", 1.4, 0.6, 300, 4],
  ["aleph-alpha", "Aleph Alpha", "aleph-alpha.com", "Sovereign AI for Europe", 0.5, 0.53, 300, 3],
  ["deepseek", "DeepSeek", "deepseek.com", "Frontier weights at a tenth the cost", 10, 1, 200, 9],
  ["zhipu-ai", "Zhipu AI", "zhipuai.cn", "GLM and China's model vanguard", 5.5, 2.5, 800, 8],
  ["moonshot-ai", "Moonshot AI", "moonshot.cn", "Kimi and million-token contexts", 3.3, 1.3, 400, 5],
  ["minimax", "MiniMax", "minimax.io", "Hailuo video and companions", 4, 1.2, 600, 6],
  ["01-ai", "01.AI", "01.ai", "Kai-Fu Lee's Yi models", 1, 0.3, 200, 5],
  ["baidu-ernie", "Baidu ERNIE", "baidu.com", "China's search giant gone genAI", 30, 2, 5000, 6],
  ["qwen", "Alibaba Qwen", "qwen.ai", "Open weights the world fine-tunes", 60, 2, 1000, 12],
  ["bytedance-seed", "ByteDance Seed", "bytedance.com", "Doubao on the TikTok compute machine", 300, 3, 3000, 8],
  ["tencent-hunyuan", "Tencent Hunyuan", "tencent.com", "Hunyuan across WeChat's universe", 480, 2, 2000, 6],
  ["sensetime", "SenseTime", "sensetime.com", "Computer vision at city scale", 5, 5.2, 4000, 4],
  ["sakana-ai", "Sakana AI", "sakana.ai", "Nature-inspired models from Tokyo", 1.5, 0.24, 40, 3],
  ["reka", "Reka", "reka.ai", "Multimodal models, tiny team", 1, 0.11, 40, 3],
  ["liquid-ai", "Liquid AI", "liquid.ai", "Foundation models beyond transformers", 2.3, 0.25, 60, 3],
  ["world-labs", "World Labs", "worldlabs.ai", "Fei-Fei Li's spatial intelligence", 1.25, 0.23, 50, 1],
  ["safe-superintelligence", "Safe Superintelligence", "ssi.inc", "One goal, zero products", 32, 3, 50, 0],
  ["thinking-machines", "Thinking Machines Lab", "thinkingmachines.ai", "Murati's frontier lab", 12, 2, 60, 1],
  ["kyutai", "Kyutai", "kyutai.org", "Open-science voice AI from Paris", 0.3, 0.33, 30, 2],
];

// wikiTitle null = no page / ambiguous plain title -> monogram fallback.
const ENGINEERS: EngineerRow[] = [
  ["yoshua-bengio", "Yoshua Bengio", "Yoshua_Bengio", "Deep learning's conscience, most-cited alive", 1000000, 500000, 97, 38],
  ["sam-altman", "Sam Altman", "Sam_Altman", "OpenAI's ringmaster", 5000, 3500000, 95, 12],
  ["dario-amodei", "Dario Amodei", "Dario_Amodei", "Scaling-laws prophet, Anthropic CEO", 90000, 500000, 94, 15],
  ["daniela-amodei", "Daniela Amodei", "Daniela_Amodei", "Anthropic's president and co-founder", 2000, 150000, 85, 12],
  ["greg-brockman", "Greg Brockman", "Greg_Brockman", "OpenAI co-founder, always shipping", 30000, 1200000, 88, 12],
  ["mira-murati", "Mira Murati", "Mira_Murati", "Ex-OpenAI CTO, Thinking Machines founder", 3000, 800000, 88, 12],
  ["jakub-pachocki", "Jakub Pachocki", "Jakub_Pachocki", "OpenAI's chief scientist", 40000, 100000, 90, 10],
  ["wojciech-zaremba", "Wojciech Zaremba", "Wojciech_Zaremba", "OpenAI co-founder, robotics to reasoning", 90000, 300000, 85, 12],
  ["jan-leike", "Jan Leike", "Jan_Leike", "Alignment lead who walked", 60000, 250000, 86, 12],
  ["jared-kaplan", "Jared Kaplan", "Jared_Kaplan", "Scaling laws co-author, Anthropic", 60000, 80000, 88, 15],
  ["tom-brown", "Tom Brown", null, "GPT-3 lead author", 120000, 60000, 87, 10],
  ["jack-clark", "Jack Clark", null, "Import AI author, policy voice", 20000, 200000, 82, 10],
  ["mark-chen", "Mark Chen", null, "OpenAI chief research officer", 50000, 100000, 86, 8],
  ["alec-radford", "Alec Radford", "Alec_Radford", "GPT, CLIP and Whisper architect", 250000, 100000, 94, 10],
  ["aditya-ramesh", "Aditya Ramesh", null, "DALL·E creator", 60000, 80000, 84, 8],
  ["tim-brooks", "Tim Brooks", null, "Sora co-lead, now world models", 30000, 80000, 82, 8],
  ["bill-peebles", "Bill Peebles", null, "Sora co-lead, DiT author", 40000, 90000, 83, 6],
  ["jason-wei", "Jason Wei", null, "Chain-of-thought author", 80000, 200000, 85, 6],
  ["noam-brown", "Noam Brown", "Noam_Brown", "Poker, Diplomacy, reasoning models", 30000, 150000, 87, 10],
  ["lilian-weng", "Lilian Weng", null, "The blog every ML engineer reads", 20000, 300000, 83, 10],
  ["barret-zoph", "Barret Zoph", null, "NAS and frontier post-training", 60000, 60000, 80, 10],
  ["ashish-vaswani", "Ashish Vaswani", "Ashish_Vaswani", "Attention Is All You Need, first author", 180000, 50000, 92, 12],
  ["jakob-uszkoreit", "Jakob Uszkoreit", "Jakob_Uszkoreit", "Transformer co-author, now programming biology", 150000, 30000, 85, 15],
  ["llion-jones", "Llion Jones", "Llion_Jones", "Transformer co-author, Sakana co-founder", 140000, 40000, 84, 12],
  ["illia-polosukhin", "Illia Polosukhin", "Illia_Polosukhin", "Transformer co-author turned NEAR founder", 130000, 300000, 80, 12],
  ["aidan-gomez", "Aidan Gomez", "Aidan_Gomez", "Transformer co-author, Cohere CEO", 140000, 150000, 85, 10],
  ["lukasz-kaiser", "Łukasz Kaiser", "Łukasz_Kaiser", "Transformer co-author, reasoning pioneer", 150000, 40000, 84, 15],
  ["niki-parmar", "Niki Parmar", null, "Transformer co-author, Essential AI", 140000, 30000, 82, 10],
  ["juergen-schmidhuber", "Jürgen Schmidhuber", "Jürgen_Schmidhuber", "LSTM godfather, credit-assignment warrior", 250000, 150000, 90, 40],
  ["sepp-hochreiter", "Sepp Hochreiter", "Sepp_Hochreiter", "LSTM inventor, xLSTM comeback", 200000, 50000, 85, 30],
  ["ian-goodfellow", "Ian Goodfellow", "Ian_Goodfellow", "GAN inventor", 500000, 300000, 92, 14],
  ["david-silver", "David Silver", "David_Silver_(computer_scientist)", "AlphaGo's mastermind", 200000, 60000, 92, 20],
  ["oriol-vinyals", "Oriol Vinyals", "Oriol_Vinyals", "Gemini co-lead, seq2seq pioneer", 250000, 200000, 90, 15],
  ["koray-kavukcuoglu", "Koray Kavukcuoglu", null, "DeepMind's CTO", 150000, 30000, 85, 18],
  ["shane-legg", "Shane Legg", "Shane_Legg", "Coined AGI, DeepMind co-founder", 40000, 60000, 87, 20],
  ["mustafa-suleyman", "Mustafa Suleyman", "Mustafa_Suleyman", "DeepMind → Inflection → Microsoft AI CEO", 10000, 400000, 86, 15],
  ["jeff-dean", "Jeff Dean", "Jeff_Dean", "Google's chief scientist, systems legend", 350000, 900000, 94, 25],
  ["quoc-le", "Quoc Le", "Quoc_V._Le", "AutoML and seq2seq at Google Brain", 250000, 100000, 87, 15],
  ["kaiming-he", "Kaiming He", "Kaiming_He", "ResNet — most-cited paper of the decade", 700000, 100000, 93, 14],
  ["ross-girshick", "Ross Girshick", null, "The R-CNN detection lineage", 400000, 30000, 86, 14],
  ["alex-krizhevsky", "Alex Krizhevsky", "Alex_Krizhevsky", "AlexNet — the big bang", 250000, 10000, 90, 14],
  ["francois-chollet", "François Chollet", "François_Chollet", "Keras creator, ARC prize", 100000, 500000, 86, 12],
  ["soumith-chintala", "Soumith Chintala", "Soumith_Chintala", "PyTorch co-creator", 80000, 300000, 87, 12],
  ["tri-dao", "Tri Dao", null, "FlashAttention and Mamba", 30000, 150000, 88, 7],
  ["albert-gu", "Albert Gu", null, "State-space models, Mamba co-author", 25000, 80000, 84, 7],
  ["percy-liang", "Percy Liang", "Percy_Liang", "HELM and foundation-model rigor", 120000, 150000, 85, 18],
  ["christopher-re", "Christopher Ré", "Christopher_Ré", "Data-centric AI, Together co-founder", 80000, 60000, 83, 18],
  ["christopher-manning", "Christopher Manning", "Christopher_D._Manning", "NLP's textbook author", 250000, 200000, 87, 30],
  ["sebastian-thrun", "Sebastian Thrun", "Sebastian_Thrun", "Self-driving pioneer, Udacity founder", 180000, 200000, 85, 30],
  ["daphne-koller", "Daphne Koller", "Daphne_Koller", "Insitro founder, PGM queen", 150000, 100000, 84, 30],
  ["pieter-abbeel", "Pieter Abbeel", "Pieter_Abbeel", "Robot learning professor-founder", 200000, 200000, 87, 20],
  ["sergey-levine", "Sergey Levine", "Sergey_Levine", "RL for robots at scale", 180000, 100000, 86, 15],
  ["chelsea-finn", "Chelsea Finn", "Chelsea_Finn", "Meta-learning, Physical Intelligence", 100000, 100000, 85, 10],
  ["richard-sutton", "Richard Sutton", "Richard_S._Sutton", "RL's founder, The Bitter Lesson", 200000, 150000, 93, 45],
  ["stuart-russell", "Stuart Russell", "Stuart_J._Russell", "AIMA co-author, safety advocate", 150000, 100000, 86, 40],
  ["peter-norvig", "Peter Norvig", "Peter_Norvig", "AIMA co-author, Google research legend", 120000, 300000, 84, 40],
  ["gary-marcus", "Gary Marcus", "Gary_Marcus", "AI's loudest skeptic", 30000, 300000, 72, 30],
  ["timnit-gebru", "Timnit Gebru", "Timnit_Gebru", "DAIR founder, accountability researcher", 50000, 400000, 80, 12],
  ["emily-bender", "Emily Bender", "Emily_M._Bender", "Stochastic parrots co-author", 40000, 100000, 75, 25],
  ["yejin-choi", "Yejin Choi", "Yejin_Choi", "Commonsense reasoning, MacArthur genius", 80000, 80000, 84, 20],
  ["ali-farhadi", "Ali Farhadi", "Ali_Farhadi", "AI2 CEO, YOLO co-creator", 150000, 30000, 80, 18],
  ["jim-fan", "Jim Fan", null, "NVIDIA's embodied-AI evangelist", 20000, 400000, 80, 8],
  ["anima-anandkumar", "Anima Anandkumar", "Anima_Anandkumar", "Tensor methods and AI for science", 60000, 200000, 80, 15],
  ["jitendra-malik", "Jitendra Malik", "Jitendra_Malik", "Vision's professor of professors", 350000, 30000, 87, 40],
  ["alexei-efros", "Alexei Efros", "Alexei_A._Efros", "Self-supervised vision pioneer", 150000, 20000, 82, 25],
  ["john-carmack", "John Carmack", "John_Carmack", "Doom legend gone AGI", 5000, 1300000, 82, 12],
  ["george-hotz", "George Hotz", "George_Hotz", "comma.ai and tinygrad", 2000, 800000, 75, 10],
  ["chris-lattner", "Chris Lattner", "Chris_Lattner", "LLVM to Mojo — compilers for AI", 30000, 250000, 82, 20],
  ["jeremy-howard", "Jeremy Howard", "Jeremy_Howard_(entrepreneur)", "fast.ai, deep learning for everyone", 40000, 300000, 82, 15],
  ["sara-hooker", "Sara Hooker", "Sara_Hooker", "Cohere Labs, the hardware lottery", 15000, 100000, 78, 10],
  ["rodney-brooks", "Rodney Brooks", "Rodney_Brooks", "Roomba, subsumption, robot realism", 100000, 100000, 80, 45],
  ["david-ha", "David Ha", null, "World models, Sakana co-founder", 30000, 200000, 81, 10],
  ["kenneth-stanley", "Kenneth Stanley", "Kenneth_Stanley", "Open-endedness and NEAT", 40000, 100000, 78, 20],
  ["volodymyr-mnih", "Volodymyr Mnih", "Volodymyr_Mnih", "DQN first author", 150000, 20000, 84, 15],
  ["alex-graves", "Alex Graves", "Alex_Graves_(computer_scientist)", "CTC and neural Turing machines", 150000, 10000, 83, 18],
  ["arthur-mensch", "Arthur Mensch", "Arthur_Mensch", "Mistral CEO, Europe's hope", 30000, 150000, 87, 10],
  ["guillaume-lample", "Guillaume Lample", "Guillaume_Lample", "Llama lead, Mistral chief scientist", 60000, 80000, 85, 9],
  ["clem-delangue", "Clément Delangue", "Clément_Delangue", "Hugging Face CEO, open-source cheerleader", 1000, 400000, 85, 12],
  ["thomas-wolf", "Thomas Wolf", null, "Transformers library architect", 50000, 300000, 84, 10],
  ["aravind-srinivas", "Aravind Srinivas", "Aravind_Srinivas", "Perplexity CEO", 10000, 500000, 82, 8],
  ["alexandr-wang", "Alexandr Wang", "Alexandr_Wang", "Scale founder, Meta superintelligence", 1000, 400000, 86, 10],
  ["liang-wenfeng", "Liang Wenfeng", "Liang_Wenfeng", "DeepSeek founder, quant turned frontier", 1000, 100000, 90, 10],
  ["kai-fu-lee", "Kai-Fu Lee", "Kai-Fu_Lee", "Sinovation, AI Superpowers author", 30000, 1000000, 80, 35],
  ["lex-fridman", "Lex Fridman", "Lex_Fridman", "MIT researcher, mega-podcast", 5000, 4000000, 72, 12],
  ["paul-christiano", "Paul Christiano", "Paul_Christiano_(researcher)", "RLHF originator, safety institute head", 20000, 100000, 84, 12],
  ["joelle-pineau", "Joelle Pineau", "Joelle_Pineau", "A decade running Meta FAIR", 40000, 60000, 79, 20],
  ["colin-raffel", "Colin Raffel", null, "T5 author, open-models advocate", 60000, 80000, 78, 10],
  ["yi-tay", "Yi Tay", null, "PaLM, UL2, Reka co-founder", 50000, 100000, 79, 8],
  ["eliezer-yudkowsky", "Eliezer Yudkowsky", "Eliezer_Yudkowsky", "Doom's most dedicated messenger", 5000, 400000, 74, 20],
  ["jeff-clune", "Jeff Clune", "Jeff_Clune", "AI-generating algorithms", 40000, 80000, 79, 15],
];

// ---------------------------------------------------------------- helpers

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function wikiThumb(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ai-index-seed/1.0 (card game seed script)" },
      });
      if (res.status === 429 || res.status >= 500) {
        console.log(`  ${title}: HTTP ${res.status}, retrying`);
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        console.log(`  ${title}: HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        type?: string;
        thumbnail?: { source?: string };
      };
      if (data.type === "disambiguation") {
        console.log(`  ${title}: disambiguation page, skipping`);
        return null;
      }
      return data.thumbnail?.source ?? null;
    } catch (err) {
      console.log(`  ${title}: ${(err as Error).message}, retrying`);
      await sleep(1500 * (attempt + 1));
    }
  }
  return null;
}

/** Re-resolve null engineer images sequentially (gentle on the API). */
async function images() {
  type Seed = { id: string; type: string; image: string | null };
  const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8")) as Seed[];
  const titles = new Map(ENGINEERS.map(([id, , title]) => [id, title]));
  let filled = 0;
  for (const card of cards) {
    if (card.type !== "engineer" || card.image !== null) continue;
    const title = titles.get(card.id);
    if (!title) continue;
    const thumb = await wikiThumb(title);
    if (thumb) {
      card.image = thumb;
      filled++;
    }
    await sleep(250);
  }
  writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n");
  const withImage = cards.filter((c) => c.type === "engineer" && c.image).length;
  console.log(`filled ${filled} more portraits; engineers with images: ${withImage}`);
}

// ---------------------------------------------------------------- build

async function build() {
  const existing = JSON.parse(readFileSync(CARDS_PATH, "utf8")) as {
    id: string;
  }[];
  const existingIds = new Set(existing.map((c) => c.id));

  const newCompanies = COMPANIES.filter(([id]) => !existingIds.has(id)).map(
    ([id, name, domain, tagline, valuation, funding, headcount, modelCount]) => ({
      id,
      name,
      type: "company",
      avatar: initials(name),
      image: favicon(domain),
      tagline,
      rarity: "common", // reassigned in phase 2
      serial: "000",
      editionSize: 500,
      series: 1,
      metrics: { valuation, funding, headcount, modelCount },
      stats: { rating: 0, innovation: 0, influence: 0, momentum: 0 },
      priceHistory: [],
    }),
  );

  const engineerRows = ENGINEERS.filter(([id]) => !existingIds.has(id));
  const newEngineers = [];
  let found = 0;
  for (let i = 0; i < engineerRows.length; i += 8) {
    const batch = engineerRows.slice(i, i + 8);
    const thumbs = await Promise.all(
      batch.map(([, , title]) => (title ? wikiThumb(title) : Promise.resolve(null))),
    );
    batch.forEach(([id, name, , tagline, citations, followers, impactScore, yearsInField], j) => {
      if (thumbs[j]) found++;
      newEngineers.push({
        id,
        name,
        type: "engineer",
        avatar: initials(name),
        image: thumbs[j],
        tagline,
        rarity: "common",
        serial: "000",
        editionSize: 500,
        series: 1,
        metrics: { citations, followers, impactScore, yearsInField },
        stats: { rating: 0, innovation: 0, influence: 0, momentum: 0 },
        priceHistory: [],
      });
    });
    console.log(`portraits: ${Math.min(i + 8, engineerRows.length)}/${engineerRows.length} checked, ${found} found`);
  }

  const all = [...existing, ...newCompanies, ...newEngineers];
  writeFileSync(CARDS_PATH, JSON.stringify(all, null, 2) + "\n");
  console.log(
    `wrote ${all.length} cards (${newCompanies.length} new companies, ${newEngineers.length} new engineers, ${found} portraits)`,
  );
}

// ---------------------------------------------------------------- assign

const EDITION_SIZES: Record<string, number> = {
  common: 500,
  rare: 100,
  epic: 25,
  legendary: 10,
  mythic: 5,
};

// rating-rank percentile -> rarity pyramid (top 3% mythic ... 45% common)
const TIER_FRACTIONS: [string, number][] = [
  ["mythic", 0.03],
  ["legendary", 0.07],
  ["epic", 0.15],
  ["rare", 0.3],
  ["common", 1],
];

async function assign() {
  // fresh import so lib/rating.ts computes maxes from the NEW cards.json
  const { computeRating } = await import("../lib/rating");
  type Seed = {
    id: string;
    rarity: string;
    serial: string;
    editionSize: number;
    stats: { rating: number; innovation: number; influence: number; momentum: number };
  };
  const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8")) as Seed[];

  const rated = cards
    .map((card) => ({ card, rating: computeRating(card as never) }))
    .sort((a, b) => b.rating - a.rating);

  const n = rated.length;
  rated.forEach(({ card, rating }, i) => {
    const pct = (i + 1) / n;
    const rarity = TIER_FRACTIONS.find(([, cum]) => pct <= cum + 1e-9)![0];
    card.rarity = rarity;
    card.editionSize = EDITION_SIZES[rarity];
    card.serial = String((fnv1a(card.id) % EDITION_SIZES[rarity]) + 1).padStart(3, "0");
    // flavor stat bars: only synthesize where the seed has none (new cards)
    if (card.stats.innovation === 0) {
      const h = fnv1a(card.id);
      const jitter = (shift: number) => ((h >> shift) % 17) - 8;
      const clamp = (v: number) => Math.max(40, Math.min(99, Math.round(v)));
      card.stats.innovation = clamp(rating + jitter(2));
      card.stats.influence = clamp(rating + jitter(7));
      card.stats.momentum = clamp(rating + jitter(13));
    }
  });

  writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n");
  const counts: Record<string, number> = {};
  for (const { card } of rated) counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
  console.log(`assigned rarities across ${n} cards:`, counts);
  console.log(
    "top 10:",
    rated.slice(0, 10).map((r) => `${(r.card as { id: string }).id}=${r.rating}`).join(", "),
  );
}

const phase = process.argv[2];
if (phase === "build") build();
else if (phase === "images") images();
else if (phase === "assign") assign();
else {
  console.error("usage: tsx scripts/seed.ts <build|images|assign>");
  process.exit(1);
}
