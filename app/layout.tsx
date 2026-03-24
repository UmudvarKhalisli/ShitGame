import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shit Game Site",
  description: "Deliberately frustrating but addictive web experience",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
