import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    totalOrders,
    pendingCount,
    inProgressCount,
    slaughteredCount,
    readyCount,
    deliveredCount,
    cancelledCount,
    withFilesCount,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { proofStatus: "PENDING" } }),
    prisma.order.count({ where: { proofStatus: "IN_PROGRESS" } }),
    prisma.order.count({ where: { proofStatus: "SLAUGHTERED" } }),
    prisma.order.count({ where: { proofStatus: "READY" } }),
    prisma.order.count({ where: { proofStatus: "DELIVERED" } }),
    prisma.order.count({ where: { proofStatus: "CANCELLED" } }),
    prisma.order.count({
      where: { proofFiles: { some: {} } },
    }),
  ]);

  const uniqueCustomers = await prisma.order.groupBy({
    by: ["customerMobile"],
    where: { customerMobile: { not: null } },
  });

  const stats = [
    { label: "إجمالي الطلبات", value: totalOrders, color: "bg-maroon text-white" },
    { label: "إجمالي العملاء", value: uniqueCustomers.length, color: "bg-cream text-white" },
    { label: "قيد التنفيذ", value: inProgressCount, color: "bg-taupe text-white" },
    { label: "تم الذبح", value: slaughteredCount, color: "bg-cream-600 text-white" },
    { label: "التوثيق جاهز", value: readyCount, color: "bg-green-600 text-white" },
    { label: "فيها ملفات", value: withFilesCount, color: "bg-blue-600 text-white" },
    { label: "بدون ملفات", value: totalOrders - withFilesCount, color: "bg-taupe-400 text-white" },
    { label: "ملغية", value: cancelledCount, color: "bg-red-600 text-white" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-maroon">لوحة التحكم</h1>
      <p className="mb-8 text-taupe">إدارة طلبات التوثيق</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl p-4 text-center ${stat.color}`}
          >
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-sm opacity-90">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
