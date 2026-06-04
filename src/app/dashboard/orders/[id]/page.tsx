import Link from "next/link";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white p-8 text-center">
      <h2 className="mb-2 text-xl font-bold text-maroon">تفاصيل الطلب</h2>
      <p className="text-taupe">
        سيتم تنفيذها في Milestone 3
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white transition hover:bg-maroon-800"
      >
        العودة للوحة التحكم
      </Link>
    </div>
  );
}