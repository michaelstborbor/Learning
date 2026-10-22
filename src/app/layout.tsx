import type { Metadata } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import { SkipLink } from "@/components/ui/SkipLink";
import { Footer } from "@/components/ui/Footer";
import { appBaseUrl } from "@/lib/app-url";

// System fonts for body text (zero network cost); Space Grotesk is
// self-hosted (via @fontsource, not a Google Fonts CDN call) and used only
// for headings/display text — see DESIGN_SYSTEM.md for the reasoning.

const APP_URL = appBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "EliteSkills Academy",
    template: "%s | EliteSkills Academy",
  },
  description:
    "Learn practical skills. Demonstrate what you can do. Connect to opportunities.",
  openGraph: {
    siteName: "EliteSkills Academy",
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
        <Footer />
      </body>
    </html>
  );
}
