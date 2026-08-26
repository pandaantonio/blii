// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import StatusProvider from "@/providers/StatusProvider";

export const metadata: Metadata = {
  title: "Sua App",
  description: "...",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <StatusProvider>{children}</StatusProvider>
      </body>
    </html>
  );
}