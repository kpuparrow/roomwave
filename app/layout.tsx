import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoomWave",
  description: "Музыкальные комнаты для синхронного прослушивания.",
  icons: {
    icon: "/roomwave.svg",
    apple: "/roomwave.svg"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
