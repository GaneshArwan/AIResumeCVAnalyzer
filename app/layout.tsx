import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume/CV Analyzer Pro",
  description: "High-performance AI Resume analysis against job descriptions. Supports Gemini, OpenAI, and Anthropic with a secure BYOK architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
