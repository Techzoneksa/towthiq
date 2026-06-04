"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: string | null;
  sku: string | null;
}

interface ProofFile {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  size: number;
  sortOrder: number;
  createdAt: string;
}

interface Order {
  id: string;
  source: string;
  externalOrderId: string | null;
  orderNumber: string;
  customerName: string | null;
  customerMobile: string | null;
  customerEmail: string | null;
  orderDate: string | null;
  amount: string | null;
  currency: string;
  storeStatus: string | null;
  proofStatus: string;
  proofToken: string;
  notes: string | null;
  items: OrderItem[];
  proofFiles: ProofFile[];
  createdAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  SALLA: "سلة",
  SHOPIFY: "Shopify",
  MANUAL: "يدوي",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار التنفيذ",
  IN_PROGRESS: "قيد التنفيذ",
  SLAUGHTERED: "تم الذبح",
  READY: "التوثيق جاهز",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [proofStatus, setProofStatus] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [statusSaving, setStatusSaving] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [customerMsg, setCustomerMsg] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrder(data.order);
      setProofStatus(data.order.proofStatus);
      setCustomerName(data.order.customerName || "");
      setCustomerMobile(data.order.customerMobile || "");
      setCustomerEmail(data.order.customerEmail || "");
      setNotes(data.order.notes || "");
    } catch {
      setError("تعذر تحميل تفاصيل الطلب");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handleStatusSave() {
    setStatusSaving(true);
    setStatusMsg("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofStatus }),
      });
      if (!res.ok) throw new Error();
      setStatusMsg("تم تحديث حالة التوثيق بنجاح");
    } catch {
      setStatusMsg("تعذر تحديث الحالة، حاول مرة أخرى");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleCustomerSave() {
    setCustomerSaving(true);
    setCustomerMsg("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName || null,
          customerMobile: customerMobile || null,
          customerEmail: customerEmail || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      setCustomerMsg("تم حفظ بيانات الطلب بنجاح");
    } catch {
      setCustomerMsg("تعذر حفظ بيانات الطلب، حاول مرة أخرى");
    } finally {
      setCustomerSaving(false);
    }
  }

  async function handleCopyLink() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
    const link = `${appUrl}/proof/${order?.proofToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopyMsg("تم نسخ رابط التوثيق");
      setTimeout(() => setCopyMsg(""), 2000);
    } catch {
      setCopyMsg("فشل النسخ");
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-cream-200 bg-white p-8 text-center text-taupe">
        جاري التحميل...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        {error || "الطلب غير موجود"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-maroon">تفاصيل الطلب</h1>
          <p className="mt-1 text-taupe">طلب رقم {order.orderNumber}</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-cream-300 bg-white px-4 py-2 text-sm font-medium text-taupe transition hover:bg-cream-50"
        >
          العودة للطلبات
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-cream-200 bg-white p-4">
            <h2 className="mb-4 text-lg font-bold text-maroon">بيانات الطلب</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-taupe">رقم الطلب</span>
                <p className="font-medium" dir="ltr">{order.orderNumber}</p>
              </div>
              <div>
                <span className="text-taupe">المصدر</span>
                <p className="font-medium">{SOURCE_LABELS[order.source] || order.source}</p>
              </div>
              <div>
                <span className="text-taupe">العميل</span>
                <p className="font-medium">{order.customerName || "-"}</p>
              </div>
              <div>
                <span className="text-taupe">الجوال</span>
                <p className="font-medium" dir="ltr">{order.customerMobile || "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-taupe">البريد الإلكتروني</span>
                <p className="font-medium" dir="ltr">{order.customerEmail || "-"}</p>
              </div>
              <div>
                <span className="text-taupe">تاريخ الطلب</span>
                <p className="font-medium">{formatDate(order.orderDate)}</p>
              </div>
              <div>
                <span className="text-taupe">المبلغ</span>
                <p className="font-medium" dir="ltr">
                  {order.amount ? `${order.amount} ${order.currency}` : "-"}
                </p>
              </div>
              <div>
                <span className="text-taupe">حالة المتجر</span>
                <p className="font-medium">{order.storeStatus || "-"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cream-200 bg-white p-4">
            <h2 className="mb-4 text-lg font-bold text-maroon">تعديل البيانات</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-taupe">اسم العميل</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-taupe">الجوال</label>
                <input
                  type="text"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-taupe">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-taupe">الملاحظات الداخلية</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  dir="rtl"
                />
              </div>
              <button
                onClick={handleCustomerSave}
                disabled={customerSaving}
                className="w-full rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white transition hover:bg-maroon-800 disabled:opacity-50"
              >
                {customerSaving ? "..." : "حفظ بيانات الطلب"}
              </button>
              {customerMsg && (
                <p className={`text-sm ${customerMsg.includes("نجاح") ? "text-green-600" : "text-red-600"}`}>
                  {customerMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-cream-200 bg-white p-4">
            <h2 className="mb-4 text-lg font-bold text-maroon">حالة التوثيق</h2>
            <div className="space-y-3">
              <select
                value={proofStatus}
                onChange={(e) => setProofStatus(e.target.value)}
                className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
              >
                <option value="PENDING">بانتظار التنفيذ</option>
                <option value="IN_PROGRESS">قيد التنفيذ</option>
                <option value="SLAUGHTERED">تم الذبح</option>
                <option value="READY">التوثيق جاهز</option>
                <option value="DELIVERED">تم التسليم</option>
                <option value="CANCELLED">ملغي</option>
              </select>
              <button
                onClick={handleStatusSave}
                disabled={statusSaving}
                className="w-full rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white transition hover:bg-maroon-800 disabled:opacity-50"
              >
                {statusSaving ? "..." : "حفظ الحالة"}
              </button>
              {statusMsg && (
                <p className={`text-sm ${statusMsg.includes("نجاح") ? "text-green-600" : "text-red-600"}`}>
                  {statusMsg}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-cream-200 bg-white p-4">
            <h2 className="mb-4 text-lg font-bold text-maroon">رابط التوثيق</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ""}/proof/${order.proofToken}`}
                className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe outline-none"
                dir="ltr"
              />
              <button
                onClick={handleCopyLink}
                className="rounded-lg bg-cream px-4 py-2 text-sm font-medium text-white transition hover:bg-cream-600"
              >
                نسخ
              </button>
            </div>
            {copyMsg && <p className="mt-2 text-sm text-green-600">{copyMsg}</p>}
          </div>

          {order.items.length > 0 && (
            <div className="rounded-xl border border-cream-200 bg-white p-4">
              <h2 className="mb-4 text-lg font-bold text-maroon">عناصر الطلب</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-100">
                    <th className="py-2 text-right font-medium text-taupe">الصنف</th>
                    <th className="py-2 text-center font-medium text-taupe">الكمية</th>
                    <th className="py-2 text-left font-medium text-taupe">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-cream-50">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-left" dir="ltr">{item.price || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-xl border border-cream-200 bg-white p-4">
            <h2 className="mb-4 text-lg font-bold text-maroon">ملفات التوثيق</h2>
            {order.proofFiles.length === 0 ? (
              <p className="text-center text-sm text-taupe">لا توجد ملفات توثيق مرفوعة بعد</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-100">
                    <th className="py-2 text-right font-medium text-taupe">النوع</th>
                    <th className="py-2 text-right font-medium text-taupe">الملف</th>
                    <th className="py-2 text-center font-medium text-taupe">الحجم</th>
                    <th className="py-2 text-center font-medium text-taupe">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {order.proofFiles.map((file) => (
                    <tr key={file.id} className="border-b border-cream-50">
                      <td className="py-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${
                          file.type === "VIDEO" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                        }`}>
                          {file.type === "VIDEO" ? "فيديو" : "صورة"}
                        </span>
                      </td>
                      <td className="py-2 font-medium" dir="ltr">{file.fileName}</td>
                      <td className="py-2 text-center text-xs text-taupe">{formatFileSize(file.size)}</td>
                      <td className="py-2 text-center text-xs text-taupe">{formatDate(file.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}