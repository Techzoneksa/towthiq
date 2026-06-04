"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Order {
  id: string;
  source: string;
  orderNumber: string;
  customerName: string | null;
  customerMobile: string | null;
  customerEmail: string | null;
  proofStatus: string;
  storeStatus: string | null;
  orderDate: string | null;
  createdAt: string;
  proofToken: string;
  filesCount: number;
  videosCount: number;
  imagesCount: number;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const SOURCE_LABELS: Record<string, string> = {
  SALLA: "سلة",
  SHOPIFY: "Shopify",
  MANUAL: "يدوي",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  IN_PROGRESS: "قيد التنفيذ",
  SLAUGHTERED: "تم الذبح",
  READY: "جاهز",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SLAUGHTERED: "bg-cream-100 text-cream-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-green-200 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export function DashboardOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [orderNumber, setOrderNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [proofStatus, setProofStatus] = useState("");
  const [source, setSource] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (orderNumber) params.set("orderNumber", orderNumber);
      if (mobile) params.set("mobile", mobile);
      if (email) params.set("email", email);
      if (proofStatus) params.set("proofStatus", proofStatus);
      if (source) params.set("source", source);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: OrdersResponse = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError("تعذر تحميل الطلبات، حاول تحديث الصفحة");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, orderNumber, mobile, email, proofStatus, source]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleSearch() {
    setPage(1);
    fetchOrders();
  }

  function handleClear() {
    setOrderNumber("");
    setMobile("");
    setEmail("");
    setProofStatus("");
    setSource("");
    setPage(1);
    fetchOrders();
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ar-SA");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cream-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-taupe">
            بحث برقم الطلب
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-36 rounded-lg border border-cream-200 px-3 py-1.5 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
            dir="ltr"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-taupe">
            بحث بالجوال
          </label>
          <input
            type="text"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-36 rounded-lg border border-cream-200 px-3 py-1.5 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
            dir="ltr"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-taupe">
            بحث بالإيميل
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-44 rounded-lg border border-cream-200 px-3 py-1.5 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
            dir="ltr"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-taupe">
            حالة التوثيق
          </label>
          <select
            value={proofStatus}
            onChange={(e) => setProofStatus(e.target.value)}
            className="w-36 rounded-lg border border-cream-200 px-3 py-1.5 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
          >
            <option value="">الكل</option>
            <option value="PENDING">قيد الانتظار</option>
            <option value="IN_PROGRESS">قيد التنفيذ</option>
            <option value="SLAUGHTERED">تم الذبح</option>
            <option value="READY">جاهز</option>
            <option value="DELIVERED">تم التسليم</option>
            <option value="CANCELLED">ملغي</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-taupe">
            المصدر
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-32 rounded-lg border border-cream-200 px-3 py-1.5 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
          >
            <option value="">الكل</option>
            <option value="SALLA">سلة</option>
            <option value="SHOPIFY">Shopify</option>
            <option value="MANUAL">يدوي</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleSearch}
            className="rounded-lg bg-maroon px-4 py-1.5 text-sm font-medium text-white transition hover:bg-maroon-800"
          >
            بحث
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-cream-300 px-4 py-1.5 text-sm font-medium text-taupe transition hover:bg-cream-50"
          >
            مسح
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-cream-200 bg-white p-8 text-center text-taupe">
          جاري التحميل...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-cream-200 bg-white p-8 text-center text-taupe">
          {orderNumber || mobile || email || proofStatus || source ? (
            <>لا توجد نتائج مطابقة</>
          ) : (
            <>لا توجد طلبات حتى الآن</>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-cream-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-100 bg-cream-50">
                  <th className="px-3 py-3 text-right font-medium text-taupe">
                    رقم الطلب
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-taupe">
                    العميل
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-taupe">
                    الجوال
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-taupe">
                    الإيميل
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-taupe">
                    المصدر
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-taupe">
                    الحالة
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-taupe">
                    الملفات
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-taupe">
                    تاريخ الطلب
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-taupe">
                    فتح
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-cream-100 hover:bg-cream-50"
                  >
                    <td className="px-3 py-3 font-medium" dir="ltr">
                      {order.orderNumber}
                    </td>
                    <td className="px-3 py-3">{order.customerName || "-"}</td>
                    <td className="px-3 py-3" dir="ltr">
                      {order.customerMobile || "-"}
                    </td>
                    <td className="px-3 py-3" dir="ltr">
                      {order.customerEmail || "-"}
                    </td>
                    <td className="px-3 py-3">
                      {SOURCE_LABELS[order.source] || order.source}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          STATUS_COLORS[order.proofStatus] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_LABELS[order.proofStatus] ||
                          order.proofStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-taupe">
                          {order.filesCount}
                        </span>
                        {order.videosCount > 0 && (
                          <span className="text-xs text-blue-600">
                            🎬{order.videosCount}
                          </span>
                        )}
                        {order.imagesCount > 0 && (
                          <span className="text-xs text-green-600">
                            📷{order.imagesCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-taupe">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="inline-block rounded-lg bg-maroon px-3 py-1 text-xs font-medium text-white transition hover:bg-maroon-800"
                      >
                        فتح
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-cream-300 px-3 py-1.5 transition hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              السابق
            </button>
            <span className="text-taupe">
              الصفحة {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="rounded-lg border border-cream-300 px-3 py-1.5 transition hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </>
      )}
    </div>
  );
}