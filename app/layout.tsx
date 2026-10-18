import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ForgePilot AI — Build with intent", description: "Turn product ideas into working software with an AI development workspace." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
