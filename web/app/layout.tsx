import type { ReactNode } from "react";
import "./globals.css";
export const metadata = { title: "Portal Inteligente de Projetos" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body><header className="header"><strong>Portal Inteligente de Projetos</strong><nav>Dashboard · Projetos · Horas · Status Report</nav></header><main className="container">{children}</main></body></html>;
}
