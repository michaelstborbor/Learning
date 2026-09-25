import type { Metadata } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import { SkipLink } from "@/components/ui/SkipLink";

// System fonts for body text (zero network cost); Space Grotesk is
// self-hosted (via @fontsource, not a Google Fonts CDN call) and used only
// for headings/display text — see DESIGN_SYSTEM.md for the reasoning.

const APP_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "EcoSkills Academy",
    template: "%s | EcoSkills Academy",
  },
  description:
    "Learn practical skills. Demonstrate what you can do. Connect to opportunities.",
  openGraph: {
    siteName: "EcoSkills Academy",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
