import Link from "next/link";

/** Homepage roast hook: a rendered sample receipt (fictional handle —
 * never a real person's live data) + the front-door CTA. */
const SAMPLE = [
  "14 repos named some variant of “test”. Bold archival strategy.",
  "One repo carries the entire account. It knows. It's tired.",
  "Bio says “building”. Building what? When? The people deserve answers.",
];

export default function RoastTeaser() {
  return (
    <div className="mb-4 grid gap-4 border-2 border-[#17301F] bg-[#F4F7F0] p-4 shadow-[4px_4px_0_#17301F] sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="font-display text-xl uppercase text-[#17301F] sm:text-2xl">
          Your GitHub has it <span className="text-[#B23A2E]">coming.</span>
        </p>
        <div className="coupon mt-3 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9CB09E]">
            Roast receipt · @sample_dev
          </p>
          <ul className="mt-1.5 space-y-1">
            {SAMPLE.map((line) => (
              <li key={line} className="text-[13px] leading-snug text-[#5A6E5E]">
                — {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link
        href="/roast"
        className="inline-block border-2 border-[#17301F] bg-[#B23A2E] px-6 py-3 text-center font-display text-sm uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] hover:bg-[#8E2E24]"
      >
        Roast me
      </Link>
    </div>
  );
}
