import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "genwork",
  description: "Gestión de proyectos por cliente y sector con etiquetado inline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
