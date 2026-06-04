import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "توثيق أضحيتي",
  description: "إدارة وتتبع توثيقات الطلبات",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-cream-50 font-arabic antialiased">
        {children}
      </body>
    </html>
  );
}
