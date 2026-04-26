import type { Metadata, Viewport } from "next";
import "./globals.css";

// Pretendard Variable 폰트 (CDN 방식 — public/fonts/PretendardVariable.woff2 추가 후 next/font/local로 전환 가능)
// 로컬 파일 전환 방법:
//   import localFont from "next/font/local";
//   const pretendard = localFont({ src: "../../public/fonts/PretendardVariable.woff2",
//     variable: "--font-pretendard", display: "swap", weight: "45 920" });
//   → <html className={`${pretendard.variable} h-full antialiased`}>

export const metadata: Metadata = {
  title: "ORNEO — 오늘의 선택으로, 더 나은 나를.",
  description: "금융·자기계발·주거를 하나의 자본 운용 대시보드로",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
