import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // 주석 처리
import "./globals.css";
import { NotificationProvider } from '@/context/NotificationContext';
import Navbar from '@/components/Navbar';

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "회의실 예약 시스템",
  description: "간편하게 회의실을 예약하고 관리하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        // className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NotificationProvider>
          <Navbar />
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
