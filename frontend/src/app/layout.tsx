import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORNEO — 오늘의 선택으로, 더 나은 나를.",
  description: "금융·자기계발·주거를 하나의 자본 운용 대시보드로",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
