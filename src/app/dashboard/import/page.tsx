"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface PreviewRow {
  rowNumber: number;
  data: Record<string, string>;
  error?: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  added: number;
  updated: number;
  failed: number;
  errors: Array<{ rowNumber: number; reason: string }>;
}

export default function ImportPage() {
  const [source, setSource] = useState<"SALLA" | "SHOPIFY" | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    previewRows: PreviewRow[];
    detectedColumns: Record<string, string | null>;
    totalRows: number;
    fileName: string;
  } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePreview() {
    if (!file || !source) {
      setError("يرجى اختيار الملف والمصدر");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.set("action", "preview");
    formData.set("file", file);
    formData.set("source", source);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل المعاينة");
      }

      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر قراءة الملف");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!file || !source) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.set("action", "commit");
    formData.set("file", file);
    formData.set("source", source);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل الاستيراد");
      }

      const data = await res.json();
      setResult(data);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الاستيراد");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSource("");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-maroon">استيراد الطلبات</h1>
          <p className="mt-1 text-taupe">ارفع ملف الطلبات من سلة أو Shopify بصيغة Excel أو CSV</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-cream-300 bg-white px-4 py-2 text-sm font-medium text-taupe transition hover:bg-cream-50"
        >
          العودة للطلبات
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <h3 className="mb-3 font-bold text-green-800">
            {result.failed === 0 ? "تم استيراد الطلبات بنجاح" : "تم تحديث الطلبات بنجاح"}
          </h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{result.totalRows}</p>
              <p className="text-green-600">إجمالي الصفوف</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{result.added}</p>
              <p className="text-green-600">تم إضافة</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{result.updated}</p>
              <p className="text-green-600">تم تحديث</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-700">{result.failed}</p>
              <p className="text-red-600">فشل</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-green-200 bg-white p-3">
              <p className="mb-2 text-sm font-medium text-taupe">الأخطاء:</p>
              {result.errors.slice(0, 20).map((err, i) => (
                <p key={i} className="text-xs text-red-600">
                  صف {err.rowNumber}: {err.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-cream-200 bg-white p-6">
        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-taupe">مصدر الملف</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="source"
                  value="SALLA"
                  checked={source === "SALLA"}
                  onChange={(e) => setSource(e.target.value as "SALLA" | "SHOPIFY")}
                  className="accent-maroon"
                />
                <span className="text-sm">سلة</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="source"
                  value="SHOPIFY"
                  checked={source === "SHOPIFY"}
                  onChange={(e) => setSource(e.target.value as "SALLA" | "SHOPIFY")}
                  className="accent-maroon"
                />
                <span className="text-sm">Shopify</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-taupe">ملف الطلبات</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
                setResult(null);
              }}
              className="w-full text-sm"
            />
            <p className="mt-1 text-xs text-taupe">الصيغ المدعومة: .xlsx, .xls, .csv</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={loading || !file || !source}
              className="rounded-lg border border-cream-300 bg-white px-4 py-2 text-sm font-medium text-taupe transition hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "..." : "معاينة الملف"}
            </button>
            {preview && (
              <button
                onClick={handleCommit}
                disabled={loading}
                className="rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white transition hover:bg-maroon-800 disabled:opacity-50"
              >
                {loading ? "..." : "اعتماد الاستيراد"}
              </button>
            )}
            <button
              onClick={handleReset}
              className="rounded-lg border border-cream-300 bg-white px-4 py-2 text-sm font-medium text-taupe transition hover:bg-cream-50"
            >
              مسح
            </button>
          </div>
        </div>

        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-taupe">
                معاينة أول {preview.previewRows.length} صف من أصل {preview.totalRows} صف
              </p>
              <p className="text-sm text-taupe">
                الملف: {preview.fileName}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cream-100 bg-cream-50">
                    <th className="px-2 py-2 text-right font-medium text-taupe">#</th>
                    <th className="px-2 py-2 text-right font-medium text-taupe">رقم الطلب</th>
                    <th className="px-2 py-2 text-right font-medium text-taupe">العميل</th>
                    <th className="px-2 py-2 text-right font-medium text-taupe">الجوال</th>
                    <th className="px-2 py-2 text-right font-medium text-taupe">الإيميل</th>
                    <th className="px-2 py-2 text-right font-medium text-taupe">المبلغ</th>
                    <th className="px-2 py-2 text-right font-medium text-taupe">الحالة</th>
                    <th className="px-2 py-2 text-right font-medium text-taupe">خطأ</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={`border-b border-cream-50 ${row.error ? "bg-red-50" : "hover:bg-cream-50"}`}
                    >
                      <td className="px-2 py-2 text-taupe">{row.rowNumber}</td>
                      <td className="px-2 py-2 font-medium" dir="ltr">
                        {row.data["رقم الطلب"] || row.data["order number"] || row.data["Name"] || "-"}
                      </td>
                      <td className="px-2 py-2">
                        {row.data["العميل"] || row.data["Customer"] || row.data["اسم العميل"] || "-"}
                      </td>
                      <td className="px-2 py-2" dir="ltr">
                        {row.data["الجوال"] || row.data["mobile"] || row.data["Phone"] || "-"}
                      </td>
                      <td className="px-2 py-2" dir="ltr">
                        {row.data["email"] || row.data["Email"] || row.data["البريد الإلكتروني"] || "-"}
                      </td>
                      <td className="px-2 py-2" dir="ltr">
                        {row.data["المبلغ"] || row.data["total"] || row.data["Total"] || "-"}
                      </td>
                      <td className="px-2 py-2">
                        {row.data["حالة الطلب"] || row.data["Status"] || row.data["status"] || "-"}
                      </td>
                      <td className="px-2 py-2 text-red-600">
                        {row.error || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}