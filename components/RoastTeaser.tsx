import Link from "next/link";

/**
 * The roast block: the page's one full colour field, in teal. Pink is the
 * brand accent everywhere else, so the roast gets the other half of the
 * palette and never competes with a CTA. The sample receipt uses a fictional
 * handle — never a real person's live data.
 */
const SAMPLE = [
  "14 repos named some variant of “test”. Bold archival strategy.",
  "One repo carries the entire account. It knows. It's tired.",
  "Bio says “building”. Building what? When?",
];

export default function RoastTeaser() {
  return (
    <div className="dark-teal-ink mb-5 rounded-[22px] bg-teal p-5 text-on-accent">
      <p className="font-display text-[24px] font-extrabold leading-tight">
        Your GitHub has it coming.
      </p>
      <p className="mt-1 text-[15px] opacity-85">
        Three lines, prepared to order.
      </p>
      <ul className="mt-3 space-y-1.5 rounded-[16px] bg-black/15 p-3">
        {SAMPLE.map((line) => (
          <li key={line} className="text-[13px] leading-snug opacity-90">
            — {line}
          </li>
        ))}
      </ul>
      <Link
        href="/roast"
        className="mt-4 inline-flex rounded-full bg-surface px-6 py-3 text-[16px] font-semibold text-ink transition-transform active:scale-[.97]"
      >
        Roast me →
      </Link>
    </div>
  );
}
