import type { Metadata } from "next";

export const metadata: Metadata = { title: "From the Editor's Desk · AI Ticker" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="paper-card p-6 sm:p-8">
        <h1 className="border-b-[3px] border-[#1E2430] pb-2 text-3xl text-[#1E2430]">
          From the Editor&apos;s Desk
        </h1>
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-[#1E2430]">
          <p>Dear reader,</p>
          <p>
            Somewhere between the price guides we grew up sleeving and the
            industry that ate the world, there was room for a magazine like
            this one. Fifty cards. One binder. Book values computed nightly
            from public signals, because a price guide that makes up its
            numbers is just a rumor with a table of contents.
          </p>
          <p>
            Rip your packs. Chase the legendaries. Never pay real money —
            we wouldn&apos;t take it anyway.
          </p>
          <p>Never rip packs angry. — The Editor</p>
        </div>

        <h2 className="mt-8 border-b-2 border-[#1E2430] pb-1 text-lg text-[#1E2430]">
          The Masthead
        </h2>
        <ul className="mt-3 space-y-2 border-2 border-[#1E2430] p-4 font-mono text-[13px] text-[#1E2430]">
          <li><span className="font-semibold uppercase">Founder</span> — has a binder, believes in it.</li>
          <li><span className="font-semibold uppercase">Claude</span> — wrote most of this, including this sentence.</li>
          <li><span className="font-semibold uppercase">The Algorithm</span> — declined to comment.</li>
        </ul>

        <p className="mt-6 border-t border-dotted border-[#9AA0AC] pt-3 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-[#9AA0AC]">
          Fine print: aiticker is a fan-made collectible game. Index values are
          computed from public signals (Wikipedia, OpenAlex, GitHub, Hugging
          Face, Hacker News). Not affiliated with anyone pictured. Not
          financial anything. No real money, no trading. Portraits via
          Wikimedia Commons (freely licensed); logos via site favicons.
          Cards of real people depict public personas with affection.
        </p>
      </div>
    </main>
  );
}
