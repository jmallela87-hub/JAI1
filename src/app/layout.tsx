import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JAI",
  description: "AI that understands before it acts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
