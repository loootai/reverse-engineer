import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppShell, type ShellNavSection } from "@/components/AppShell";
import { APP_NAME } from "@/jobs";
import { getState } from "@/lib/app";
import { currentCsrf, requireAdminPage } from "@/lib/auth/guard";
import { isPublicPath } from "@/lib/auth/routes";
import { Ledger } from "@/lib/ledger";
import { usd } from "@/lib/money";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "A small product built on looot. Replace this text.",
  icons: { icon: "/brand/looot-mark.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1512" },
  ],
};

const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get("theme");var t=q||localStorage.getItem("theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

const NAV: ShellNavSection[] = [
  {
    heading: "Workspace",
    items: [
      { href: "/", label: "Results", icon: "dashboard" },
      { href: "/jobs", label: "Jobs and prices", icon: "layers" },
      { href: "/costs", label: "Costs", icon: "receipt" },
    ],
  },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-app-path") ?? "";
  // Public routes (sign-in) render with no stored data and no admin navigation.
  if (path !== "" && isPublicPath(path)) {
    return (
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="min-h-dvh bg-page text-ink">
          <main className="mx-auto min-h-dvh max-w-xl px-4 py-10">{children}</main>
        </body>
      </html>
    );
  }
  const gate = await requireAdminPage();
  const csrf = await currentCsrf();
  const state = await getState();
  const total = new Ledger(state.ledger).totalMicros;
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="app-csrf" content={csrf} />
      </head>
      <body className="min-h-dvh bg-page text-ink">
        <AppShell appName={APP_NAME} nav={NAV} githubHref="https://github.com/loootai/reverse-engineer" demoLabel={gate.policy.mode === "open-demo" ? "Demo, no sign-in" : undefined} signOut={gate.policy.mode === "login"} spend={{ label: "Spent in total", spent: usd(total) }}>
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">{children}</div>
        </AppShell>
      </body>
    </html>
  );
}
