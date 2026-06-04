import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/dashboard/login");
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-cream-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-sm text-taupe">توثيق أضحيتي</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-taupe-700 transition hover:text-maroon"
            >
              لوحة التحكم
            </Link>
            <Link
              href="/dashboard/import"
              className="text-taupe-700 transition hover:text-maroon"
            >
              الاستيراد
            </Link>
            <Link
              href="/dashboard/bulk-upload"
              className="text-taupe-700 transition hover:text-maroon"
            >
              الرفع الجماعي
            </Link>
            <Link
              href="/api/auth/signout"
              className="rounded-lg border border-cream-300 px-3 py-1.5 text-taupe-600 transition hover:bg-cream-50"
            >
              خروج
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
