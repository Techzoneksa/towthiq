"use client";

import { useState } from "react";
import Link from "next/link";

interface Order {
  orderNumber: string;
  customerName: string | null;
  orderDate: string | null;
  proofStatus: string;
  proofToken: string;
  filesCount: number;
  videosCount: number;
  imagesCount: number;
  hasMedia: boolean;
}

const STATUS_MESSAGES: Record<string, string> = {
  PENDING: "تم استلام طلبكم، وجاري التحضير للتنفيذ.",
  IN_PROGRESS: "طلبكم قيد التنفيذ حاليًا، وسيتم تحديث التوثيق عند اكتماله.",
  SLAUGHTERED: "تم تنفيذ الذبح، وجاري تجهيز ملفات التوثيق.",
  READY: "توثيق طلبكم جاهز للمشاهدة.",
  DELIVERED: "تم اكتمال التوثيق وتسليم ملفات الطلب.",
  CANCELLED: "هذا الطلب ملغي. للتفاصيل يرجى التواصل معنا.",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TrackPage() {
  const [searchType, setSearchType] = useState<"mobile" | "email">("mobile");
  const [mobile, setMobile] = useState("");
  const [countryCode] = useState("966");
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrders([]);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      params.set("searchType", searchType);
      if (searchType === "mobile") {
        params.set("mobile", mobile);
      } else {
        params.set("email", email);
      }

      const res = await fetch(`/api/lookup?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "البريد الإلكتروني غير صحيح") {
          setError("البريد الإلكتروني غير صحيح");
        } else {
          setError(data.error || "حدث خطأ");
        }
        return;
      }

      setOrders(data.orders || []);
    } catch {
      setError("تعذر الاتصال، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  function resetSearch() {
    setOrders([]);
    setSearched(false);
    setError("");
    setMobile("");
    setEmail("");
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-maroon text-2xl font-bold text-white">
            أ
          </div>
          <h1 className="text-2xl font-bold text-maroon">توثيقات أضحيتي</h1>
          <p className="mt-2 text-sm text-taupe">
            أدخل رقم جوالك أو بريدك الإلكتروني لمشاهدة توثيقات طلباتك
          </p>
        </div>

        <div className="mb-4 flex rounded-xl bg-cream-100 p-1">
          <button
            onClick={() => {
              setSearchType("mobile");
              setOrders([]);
              setSearched(false);
              setError("");
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              searchType === "mobile"
                ? "bg-white text-maroon shadow-sm"
                : "text-taupe hover:text-maroon"
            }`}
          >
            البحث بالجوال
          </button>
          <button
            onClick={() => {
              setSearchType("email");
              setOrders([]);
              setSearched(false);
              setError("");
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              searchType === "email"
                ? "bg-white text-maroon shadow-sm"
                : "text-taupe hover:text-maroon"
            }`}
          >
            البحث بالإيميل
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {searchType === "mobile" ? (
            <div>
              <div className="flex gap-2">
                <div className="w-20 rounded-lg border border-cream-200 bg-white px-3 py-2.5 text-center text-sm text-taupe">
                  +{countryCode}
                </div>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="5XXXXXXXX"
                  className="flex-1 rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-lg outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  dir="ltr"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-taupe-500">
                اكتب رقم الجوال بدون الصفر الأول، مثال: 5XXXXXXXX
              </p>
            </div>
          ) : (
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                className="w-full rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-lg outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                dir="ltr"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-maroon px-4 py-3 text-lg font-medium text-white transition hover:bg-maroon-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "..." : "عرض التوثيق"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {searched && !loading && orders.length === 0 && !error && (
          <div className="mt-6 rounded-xl border border-cream-200 bg-white p-6 text-center">
            <p className="text-sm text-taupe">
              لم نجد طلبًا مرتبطًا بهذه البيانات. تأكد من الرقم أو البريد وحاول مرة أخرى.
            </p>
          </div>
        )}

        {searched && !loading && orders.length === 1 && !error && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-cream-200 bg-white p-6">
              <div className="mb-4 text-center">
                <p className="text-2xl font-bold text-maroon" dir="ltr">
                  {orders[0].orderNumber}
                </p>
                {orders[0].customerName && (
                  <p className="mt-1 text-sm text-taupe">{orders[0].customerName}</p>
                )}
                {orders[0].orderDate && (
                  <p className="mt-1 text-xs text-taupe">
                    {formatDate(orders[0].orderDate)}
                  </p>
                )}
              </div>
              <div className="mb-4 rounded-lg bg-cream-50 p-3 text-center text-sm">
                {STATUS_MESSAGES[orders[0].proofStatus] || orders[0].proofStatus}
              </div>
              <div className="mb-4 text-center text-xs text-taupe">
                {orders[0].hasMedia ? (
                  <span className="text-green-600">✓ توثيق طلبكم جاهز للمشاهدة</span>
                ) : (
                  <span>
                    تم العثور على طلبكم، وجاري تجهيز التوثيق. سيتم إتاحة الصور والفيديوهات
                    فور اكتمال الرفع.
                  </span>
                )}
              </div>
              <Link
                href={`/proof/${orders[0].proofToken}`}
                className="block w-full rounded-lg bg-maroon px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-maroon-800"
              >
                {orders[0].hasMedia ? "مشاهدة التوثيق" : "متابعة حالة الطلب"}
              </Link>
            </div>
            <button
              onClick={resetSearch}
              className="w-full rounded-lg border border-cream-300 bg-white px-4 py-2 text-sm text-taupe transition hover:bg-cream-50"
            >
              العودة للبحث
            </button>
          </div>
        )}

        {searched && !loading && orders.length > 1 && !error && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-cream-200 bg-white p-4 text-center">
              <p className="text-sm text-taupe">
                وجدنا أكثر من طلب مرتبط ببياناتك. اختر الطلب الذي ترغب في متابعته.
              </p>
            </div>
            {orders.map((order) => (
              <div
                key={order.proofToken}
                className="rounded-xl border border-cream-200 bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-maroon" dir="ltr">
                      {order.orderNumber}
                    </p>
                    {order.customerName && (
                      <p className="text-xs text-taupe">{order.customerName}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      order.hasMedia
                        ? "bg-green-100 text-green-700"
                        : "bg-cream-100 text-cream-700"
                    }`}
                  >
                    {order.hasMedia ? "جاهز" : "قيد التجهيز"}
                  </span>
                </div>
                <div className="mb-3 text-xs text-taupe">
                  {STATUS_MESSAGES[order.proofStatus] || order.proofStatus}
                </div>
                <Link
                  href={`/proof/${order.proofToken}`}
                  className="block w-full rounded-lg bg-maroon px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-maroon-800"
                >
                  {order.hasMedia ? "مشاهدة التوثيق" : "متابعة حالة الطلب"}
                </Link>
              </div>
            ))}
            <button
              onClick={resetSearch}
              className="w-full rounded-lg border border-cream-300 bg-white px-4 py-2 text-sm text-taupe transition hover:bg-cream-50"
            >
              العودة للبحث
            </button>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 text-center text-sm">
          <a
            href="https://odheyati.com"
            className="text-taupe hover:text-maroon"
          >
            العودة إلى المتجر
          </a>
          <a
            href="https://api.whatsapp.com/send?phone=966562365161&text="
            target="_blank"
            rel="noopener noreferrer"
            className="text-taupe hover:text-maroon"
          >
            تواصل معنا عبر واتساب
          </a>
        </div>
      </div>
    </main>
  );
}