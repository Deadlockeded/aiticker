import type { Metadata } from "next";

const title = "From the Editor's Desk — aiticker";

export const metadata: Metadata = {
  title,
  description: "The internet's leading* price guide for AI trading cards. (*Only.)",
  openGraph: {
    title,
    images: [{ url: "/api/og/promo?page=about", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title, images: ["/api/og/promo?page=about"] },
};

const H = "mt-8 border-b-2 border-[#1E2430] pb-1 text-lg text-[#1E2430]";
const P = "text-[15px] leading-relaxed text-[#1E2430]";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="paper-card p-6 sm:p-8">
        <h1 className="border-b-[3px] border-[#1E2430] pb-2 text-3xl text-[#1E2430]">
          From the Editor&apos;s Desk
        </h1>
        <div className={`mt-4 space-y-3 ${P}`}>
          <p>
            Welcome to aiticker, the internet&apos;s leading* price guide for
            artificial intelligence trading cards.
          </p>
          <p className="text-[13px] italic text-[#5A6070]">
            (*We are also the internet&apos;s only price guide for artificial
            intelligence trading cards. The race was not close, because no one
            else entered it.)
          </p>
          <p>
            We maintain a live index of the AI industry, in card form, using
            real public data and fake money. Why? Because the AI industry
            already behaves like a trading card game — mysterious legendaries,
            overhyped rookies, one paperclip — and someone needed to make it
            official. That someone had better things to do. So we did it.
          </p>
        </div>

        <h2 className={H}>Masthead</h2>
        <ul className="mt-3 space-y-3 border-2 border-[#1E2430] p-4 text-[14px] leading-relaxed text-[#1E2430]">
          <li>
            <span className="font-mono font-semibold uppercase tracking-wider">The Editor</span>{" "}
            — Founder, publisher, subscription department. Has a binder.
            Believes in it. Rated 61 by his own algorithm and has chosen to
            interpret that as a data quality issue.
          </li>
          <li>
            <span className="font-mono font-semibold uppercase tracking-wider">Claude</span>{" "}
            — Staff writer. Wrote most of this website, including this
            sentence, including the joke about the Editor&apos;s rating, and
            would like the record to show it was the Editor&apos;s idea to be
            rated in the first place.
          </li>
          <li>
            <span className="font-mono font-semibold uppercase tracking-wider">The Algorithm</span>{" "}
            — Chief Ratings Officer. Declined to comment. Declines all
            comment. We are no longer sure it can hear us.
          </li>
        </ul>

        <h2 className={H}>Circulation</h2>
        <div className={`mt-3 space-y-1 font-mono text-[13px] text-[#1E2430]`}>
          <p>Daily readers: several.</p>
          <p>
            Packs ripped to date: we stopped counting at a number we&apos;d
            rather not print.
          </p>
          <p>
            Legendary pull rate: 1.5%, which our lawyers describe as &quot;a
            percentage.&quot;
          </p>
          <p>Employees: see masthead. Payroll: see &quot;fake money.&quot;</p>
        </div>

        <h2 className={H}>Methodology</h2>
        <p className={`mt-3 ${P}`}>
          Our index prices are computed nightly from genuinely real public
          signals — Wikipedia attention, research citations, GitHub activity,
          Hugging Face downloads, and Hacker News chatter. This is, we must
          stress, an actual data pipeline that actually runs, which makes it
          the most professionally engineered part of a website about cartoon
          foil cards. The Em Dash&apos;s valuation methodology remains
          proprietary, primarily because we don&apos;t understand it either.
        </p>

        <h2 className={H}>Frequently Asked Question</h2>
        <div className={`mt-3 ${P}`}>
          <p className="font-semibold">Q: Is this a real financial product?</p>
          <p>A: We publish a price guide for a card of a paperclip. No.</p>
        </div>

        <h2 className={H}>Disclosures (the true parts, in the funny font)</h2>
        <div className="mt-3 space-y-2 font-mono text-[11px] leading-relaxed text-[#5A6070]">
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
            a card and would like yours changed, write to us — being on a card and complaining about the card is, however,
            extremely card behavior.
          </p>
          <p>§ The Wrapper card is autobiographical.</p>
        </div>

        <h2 className={H}>Contact</h2>
        <p className={`mt-3 ${P}`}>
          Corrections may be shouted into the void. The void maintains our
          complaints department. Legendary pull screenshots may be posted
          anywhere; we will find them.
        </p>

        <p className={`mt-6 ${P}`}>
          — THE EDITOR
          <br />
          <span className="italic text-[#5A6070]">&quot;Never rip packs angry.&quot;</span>
        </p>
      </div>
    </main>
  );
}
