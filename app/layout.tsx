import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-noto-thai",
});

export const metadata: Metadata = {
  title: "เริ่มจากข้างใน | Start from Within",
  description: "การสำรวจตัวเองด้วยโมเดลภูเขาน้ำแข็งของซาเทียร์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${notoSansThai.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
