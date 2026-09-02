import Link from "next/link";
import { ShieldIcon } from "@/components/ui/Icons";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Quiet ambient glow — the one deliberate visual flourish on this page */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px]"
      />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <h1 className="bg-accent-gradient bg-clip-text text-5xl font-semibold tracking-tight text-transparent">
          JAI
        </h1>

        <h2 className="mt-10 text-3xl font-semibold leading-tight text-text sm:text-4xl">
          AI that <span className="text-accent">understands</span>
          <br />
          before it acts.
        </h2>

        <p className="mt-5 max-w-sm text-balance text-[15px] leading-relaxed text-text-muted">
          Ask anything. Build anything. JAI asks the right questions,
          understands what you actually need, and then helps you get it
          done.
        </p>

        <Link
          href="/signup"
          className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-4 text-base font-medium text-white shadow-[0_0_40px_-10px_rgba(108,92,231,0.6)] transition hover:brightness-110"
        >
          Start for Free
          <span aria-hidden>→</span>
        </Link>

        <div className="mt-8 flex items-center gap-4 text-xs text-text-faint">
          <span className="flex items-center gap-1.5">
            <ShieldIcon width={14} height={14} />
            Private workspace
          </span>
          <span className="h-3 w-px bg-border" />
          <span>Multiple AI models</span>
        </div>
      </div>
    </main>
  );
}
