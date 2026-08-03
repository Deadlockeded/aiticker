import Link from "next/link";
import Logo from "@/components/Logo";

/** 404 — the arrow has fallen sideways. Plain register. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Logo variant="icon" size={64} fallen />
      <p className="text-[32px] text-ink">Not a page.</p>
      <p className="text-[15px] text-ink2">The index doesn&apos;t go here.</p>
      <Link
        href="/"
        className="rounded-full bg-pink px-6 py-3 text-[16px] font-semibold text-on-accent transition-transform active:scale-[.97]"
      >
        Back to the index
      </Link>
    </main>
  );
}
