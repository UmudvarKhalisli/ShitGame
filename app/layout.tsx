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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Noto+Sans:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
