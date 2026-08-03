import Link from "next/link";
import Logo from "@/components/Logo";

/** 404 — the arrow has fallen sideways. Plain register. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Logo variant="icon" size={64} fallen />
      <p className="font-display text-4xl uppercase text-ink">Not a page.</p>
      <p className="text-sm text-ink2">The index doesn&apos;t go here.</p>
      <Link
        href="/"
        className="border border-line2 bg-pink px-6 py-2.5 font-display text-sm uppercase text-on-accent shadow-card hover:bg-pink"
      >
        Back to the index
      </Link>
    </main>
  );
}
