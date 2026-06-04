"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ProofFile {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string | null;
  createdAt: string;
  urlFailed: boolean;
}

interface ProofData {
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    orderDate: string | null;
    proofStatus: string;
  };
  files: ProofFile[];
  hasFailedUrls: boolean;
  allUrlsFailed: boolean;
}

const STATUS_MESSAGES: Record<string, { main: string; sub?: string }> = {
  PENDING: {
    main: "تم استلام طلبكم، وجاري التحضير للتنفيذ.",
  },
  IN_PROGRESS: {
    main: "طلبكم قيد التنفيذ حاليًا، وسيتم تحديث التوثيق عند اكتماله.",
  },
  SLAUGHTERED: {
    main: "تم تنفيذ الذبح، وجاري تجهيز ملفات التوثيق.",
  },
  READY: {
    main: "توثيق طلبكم جاهز للمشاهدة.",
  },
  DELIVERED: {
    main: "تم اكتمال التوثيق وتسليم ملفات الطلب.",
  },
  CANCELLED: {
    main: "هذا الطلب ملغي. للتفاصيل يرجى التواصل معنا.",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProofPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProof = useCallback(async () => {
    try {
      const res = await fetch(`/api/proof/${token}`);
      if (res.status === 404) {
        setError("لم يتم العثور على التوثيق. تأكد من الرابط أو ابحث برقم الجوال أو البريد.");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch");
      }
      const proofData: ProofData = await res.json();
      setData(proofData);
    } catch {
      setError("تعذر تحميل التوثيق مؤقتًا. يرجى المحاولة لاحقًا.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProof();
  }, [fetchProof]);

  if (loading) {
    return (
      <main className="min-h-screen bg-cream-50 px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-xl border border-cream-200 bg-white p-8 text-center">
            <p className="text-taupe">جاري التحميل...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-cream-50 px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">{error || "لم يتم العثور على التوثيق"}</p>
            <Link
              href="/track"
              className="mt-4 inline-block rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white transition hover:bg-maroon-800"
            >
              العودة للبحث
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { order, files, hasFailedUrls, allUrlsFailed } = data;
  const statusInfo = STATUS_MESSAGES[order.proofStatus] || {
    main: "حالة غير معروفة",
  };

  const videos = files.filter((f) => f.type === "VIDEO" && f.url && !f.urlFailed);
  const images = files.filter((f) => f.type === "IMAGE" && f.url && !f.urlFailed);
  const showFiles = order.proofStatus !== "CANCELLED" && !allUrlsFailed;
  const showUrlWarning = hasFailedUrls && !allUrlsFailed;

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-maroon text-xl font-bold text-white">
            أ
          </div>
          <h1 className="text-xl font-bold text-maroon">توثيق طلبك</h1>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-cream-200 bg-white p-5">
            {order.customerName && (
              <p className="mb-1 text-center text-lg">
                مرحبًا، {order.customerName}
              </p>
            )}
            <p className="mb-1 text-center text-sm text-taupe">
              طلب رقم: <span className="font-bold" dir="ltr">{order.orderNumber}</span>
            </p>
            {order.orderDate && (
              <p className="mb-3 text-center text-xs text-taupe">
                {formatDate(order.orderDate)}
              </p>
            )}
            <div className="rounded-lg bg-cream-50 p-3 text-center text-sm">
              {statusInfo.main}
            </div>
          </div>

          {showUrlWarning && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center text-xs text-yellow-700">
              تم العثور على طلبكم، لكن تعذر تحميل بعض ملفات التوثيق مؤقتًا. يرجى المحاولة لاحقًا.
            </div>
          )}

          {showFiles && files.length === 0 && (
            <div className="rounded-xl border border-cream-200 bg-white p-5 text-center">
              <p className="text-sm text-taupe">
                تم العثور على طلبكم، وجاري تجهيز التوثيق. سيتم إتاحة الصور والفيديوهات فور اكتمال الرفع.
              </p>
            </div>
          )}

          {showFiles && videos.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-taupe">الفيديوهات</h2>
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="relative overflow-hidden rounded-xl bg-gray-900"
                  style={{ aspectRatio: "9/16", maxWidth: "280px", margin: "0 auto" }}
                >
                  <video
                    src={video.url!}
                    controls
                    className="h-full w-full object-contain"
                    style={{ borderRadius: "0.75rem" }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ))}
            </div>
          )}

          {showFiles && images.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-taupe">الصور</h2>
              <div className="grid grid-cols-2 gap-2">
                {images.map((image) => (
                  <a
                    key={image.id}
                    href={image.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl border border-cream-200"
                  >
                    <img
                      src={image.url!}
                      alt={image.fileName}
                      className="h-full w-full object-cover"
                      style={{ borderRadius: "0.75rem" }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href="/track"
              className="block w-full rounded-lg border border-cream-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-taupe transition hover:bg-cream-50"
            >
              العودة للبحث
            </Link>
            <a
              href="https://odheyati.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg border border-cream-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-taupe transition hover:bg-cream-50"
            >
              العودة إلى المتجر
            </a>
            <a
              href="https://api.whatsapp.com/send?phone=966562365161&text="
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg bg-green-600 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-green-700"
            >
              تواصل معنا عبر واتساب
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}