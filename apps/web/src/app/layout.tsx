import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C.O.R.T.E.X. — AI Conversation Intelligence Platform",
  description: "Import, search, analyze, and generate knowledge from all your AI conversations. Your data. Your control.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
