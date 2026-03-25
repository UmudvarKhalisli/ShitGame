import type { Metadata } from "next";
import "./globals.css";
import GlobalCursor from "@/components/ui/GlobalCursor";

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
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Inter:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <GlobalCursor />
      </body>
    </html>
  );
}
