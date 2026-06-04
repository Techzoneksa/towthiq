import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50">
      <div className="w-full max-w-md px-6 text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-maroon text-3xl font-bold text-white">
            أ
          </div>
          <h1 className="text-3xl font-bold text-maroon">توثيق أضحيتي</h1>
          <p className="mt-2 text-taupe">
            إدارة وتتبع توثيقات الطلبات
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/track"
            className="block w-full rounded-lg bg-maroon px-6 py-3 text-center text-lg font-medium text-white transition hover:bg-maroon-800"
          >
            تتبع طلبك
          </Link>
          <Link
            href="/dashboard/login"
            className="block w-full rounded-lg border border-cream-300 bg-white px-6 py-3 text-center text-lg font-medium text-maroon transition hover:bg-cream-50"
          >
            لوحة التحكم
          </Link>
        </div>
      </div>
    </main>
  );
}
