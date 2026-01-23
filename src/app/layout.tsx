import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cEDH Analytics",
  description: "Data-driven insights for competitive Commander. Track commander performance, card frequencies, and meta trends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="knd-body"
      >
        {children}
      </body>
    </html>
  );
}
