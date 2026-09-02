import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block bg-accent-gradient bg-clip-text text-2xl font-semibold text-transparent"
        >
          JAI
        </Link>
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
        <div className="mt-8 flex w-full flex-col items-start">{children}</div>
      </div>
    </main>
  );
}
