import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { AppShell } from "@/components/layout/AppShell";
import { SwRegister } from "@/components/pwa/SwRegister";

export const metadata: Metadata = {
  title: { default: "University Manager", template: "%s | University Manager" },
  description: "Your private academic life, in one place.",
  manifest: "/manifest.json",
  applicationName: "University Manager",
  icons: {
    icon: [
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "UniManager", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3366ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

// Runs before first paint: dark is the default theme, so the server renders
// <html class="dark"> and this only has work to do for a saved light
// preference. Without it, the browser painted the light theme first and
// then snapped to dark once React mounted -- the white flash on refresh.
const THEME_BOOT_SCRIPT = `(function(){try{var t=window.localStorage.getItem("um-theme");if(t==="light"){document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}else{document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <SwRegister />
      </body>
    </html>
  );
}
