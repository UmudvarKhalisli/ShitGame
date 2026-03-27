import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoshBesh",
  description: "Deliberately frustrating but addictive web experience",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Exo+2:wght@700;800&family=Share+Tech+Mono&family=Inter:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100" style={{ fontFamily: "Inter, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
