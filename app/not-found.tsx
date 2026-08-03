import Link from "next/link";
import Logo from "@/components/Logo";

/** 404 — the arrow has fallen sideways. Plain register. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Logo variant="icon" size={64} fallen />
      <p className="font-display text-4xl uppercase text-[#17301F]">Not a page.</p>
      <p className="text-sm text-[#5A6E5E]">The index doesn&apos;t go here.</p>
      <Link
        href="/"
        className="border-2 border-[#17301F] bg-[#B23A2E] px-6 py-2.5 font-display text-sm uppercase text-[#F4F7F0] shadow-[3px_3px_0_#17301F] hover:bg-[#8E2E24]"
      >
        Back to the index
      </Link>
    </main>
  );
}
