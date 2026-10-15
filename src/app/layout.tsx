import type { Metadata, Viewport } from "next";
import { Montserrat, Roboto_Mono } from "next/font/google";
import { ThemeScript } from "@gen/ui";
import "@gen/ui/styles.css";
import "@gen/ui/themes/genwork.css";
import "./globals.css";
import { Providers } from "./providers";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" });
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: process.env.AUTH_URL ? new URL(process.env.AUTH_URL) : undefined,
  title: { default: "›genwork", template: "%s — ›genwork" },
  description: "Gestor de proyectos y tareas para equipos de trabajo",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "genwork",
    description: "Gestor de proyectos y tareas para equipos de trabajo",
    siteName: "genwork",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "genwork" }],
    type: "website",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "genwork",
    description: "Gestor de proyectos y tareas para equipos de trabajo",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${robotoMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript storageKey="gw:theme" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
