/** The wordmark header — magazine visual treatment, modern copy. */
export default function Masthead({ cardCount }: { cardCount: number }) {
  return (
    <header className="paper-in border-b-[3px] border-[#1E2430] pb-3 text-center">
      <h1 className="mt-1 text-5xl leading-none text-[#1E2430] sm:text-7xl">
        ai<span className="text-[#C23B2E]">ticker</span>
      </h1>
      <p className="mt-2 text-[15px] text-[#5A6070]">
        Trading cards for the AI industry. Real data. Fake money.
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#9AA0AC]">
        {cardCount} cards · 3 free packs daily
      </p>
    </header>
  );
}
