import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-brand" });

export const metadata: Metadata = {
  title: "genwork",
  description: "Gestión de proyectos por cliente y sector con etiquetado inline",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("gw:theme");
    var theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var resolved =
      theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;
    document.documentElement.dataset.theme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
