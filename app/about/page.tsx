import type { Metadata } from "next";

const title = "About — aiticker";

export const metadata: Metadata = {
  title,
  description: "A trading-card index for the AI industry. Real data. Fake money.",
  openGraph: {
    title,
    images: [{ url: "/api/og/promo?page=about", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title, images: ["/api/og/promo?page=about"] },
};

const H = "mt-8 border-b-2 border-[#17301F] pb-1 text-lg text-[#17301F]";
const P = "text-[15px] leading-relaxed text-[#17301F]";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="paper-card p-6 sm:p-8">
        <h1 className="border-b-[3px] border-[#17301F] pb-2 text-3xl text-[#17301F]">
          About
        </h1>
        <div className={`mt-4 space-y-3 ${P}`}>
          <p>
            aiticker is a live index of the AI industry, in trading-card form,
            built on real public data and fake money.
          </p>
          <p>
            Why? Because the AI industry already behaves like a trading card
            game — mysterious legendaries, overhyped rookies, one paperclip —
            and someone needed to make it official. That someone had better
            things to do. So we did it.
          </p>
        </div>

        <h2 className={H}>Staff</h2>
        <ul className="mt-3 space-y-3 border-2 border-[#17301F] p-4 text-[14px] leading-relaxed text-[#17301F]">
          <li>
            <span className="font-mono font-semibold uppercase tracking-wider">Founder</span>{" "}
            — Has a binder. Believes in it. Rated 61 by his own algorithm and
            has chosen to interpret that as a data quality issue.
          </li>
          <li>
            <span className="font-mono font-semibold uppercase tracking-wider">Claude</span>{" "}
            — Staff writer. Wrote most of this website, including this
            sentence, including the joke about the founder&apos;s rating, and
            would like the record to show it was the founder&apos;s idea to be
            rated in the first place.
          </li>
          <li>
            <span className="font-mono font-semibold uppercase tracking-wider">The Algorithm</span>{" "}
            — Chief Ratings Officer. Declined to comment. Declines all
            comment. We are no longer sure it can hear us.
          </li>
        </ul>

        <h2 className={H}>Methodology</h2>
        <p className={`mt-3 ${P}`}>
          Prices are computed nightly from genuinely real public signals —
          Wikipedia attention, research citations, GitHub activity, Hugging
          Face downloads, and Hacker News chatter. This is, we must stress, an
          actual data pipeline that actually runs, which makes it the most
          professionally engineered part of a website about cartoon foil
          cards. The Em Dash&apos;s valuation methodology remains proprietary,
          primarily because we don&apos;t understand it either.
        </p>

        <h2 className={H}>Frequently Asked Question</h2>
        <div className={`mt-3 ${P}`}>
          <p className="font-semibold">Q: Is this a real financial product?</p>
          <p>A: We publish a price for a card of a paperclip. No.</p>
        </div>

        <h2 className={H}>Disclosures (the true parts, in the funny font)</h2>
        <div className="mt-3 space-y-2 font-mono text-[11px] leading-relaxed text-[#5A6E5E]">
          <p>
            § Not affiliated with, endorsed by, or on speaking terms with any
            person, company, laboratory, or punctuation mark listed on the
            index.
          </p>
          <p>
            § Cards and Ticks have no monetary value. They cannot be bought
            for money, sold for money, or cashed out. We have made this
            legally impossible and emotionally difficult.
          </p>
          <p>
            § Nothing on this site is financial advice, career advice, or
            advice.
          </p>
          <p>
            § All quips refer to public personas with affection. If you are on
            a card and would like yours changed, write to us — being on a card
            and complaining about the card is, however, extremely card
            behavior.
          </p>
          <p>§ The Wrapper card is autobiographical.</p>
        </div>

        <h2 className={H}>Contact</h2>
        <p className={`mt-3 ${P}`}>
          Corrections may be shouted into the void. The void maintains our
          complaints department. Legendary pull screenshots may be posted
          anywhere; we will find them.
        </p>

        <p className={`mt-6 italic text-[#5A6E5E]`}>&quot;Never rip packs angry.&quot;</p>
      </div>
    </main>
  );
}
