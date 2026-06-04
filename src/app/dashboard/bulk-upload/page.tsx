"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

interface UploadResult {
  fileName: string;
  orderNumber: string | null;
  status: "success" | "failed";
  reason?: string;
}

interface UploadResponse {
  total: number;
  success: number;
  failed: number;
  videos: number;
  images: number;
  results: UploadResult[];
}

const ALLOWED_EXTENSIONS = ["mp4", "mov", "webm", "jpg", "jpeg", "png", "webp"];
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function BulkUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return "نوع الملف غير مدعوم";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "حجم الملف أكبر من الحد المسموح 100MB";
    }
    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileArray = Array.from(newFiles);
    const validated = fileArray.map((f) => ({
      file: f,
      error: validateFile(f),
    }));
    setFiles((prev) => [...prev, ...validated.map((v) => v.file)]);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const clearAll = () => {
    setFiles([]);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function handleUpload() {
    if (files.length === 0) return;

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل الرفع");
      }

      const data: UploadResponse = await res.json();
      setResult(data);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر رفع الملفات");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-maroon">رفع جماعي للتوثيقات</h1>
          <p className="mt-1 text-taupe">
            ارفع صور وفيديوهات التوثيق، وسيتم ربط كل ملف بالطلب حسب رقم الطلب الموجود في اسم الملف
          </p>
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

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragging
            ? "border-maroon bg-maroon-50"
            : "border-cream-300 hover:border-maroon hover:bg-cream-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.webm,.jpg,.jpeg,.png,.webp"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <p className="text-lg font-medium text-taupe">
          اسحب الملفات هنا أو اضغط لاختيارها
        </p>
        <p className="mt-1 text-sm text-taupe-500">
          الفيديوهات: MP4, MOV, WebM | الصور: JPG, JPEG, PNG, WebP | max 100MB per file
        </p>
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border border-cream-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-taupe">
              {files.length} ملف (max 100)
            </p>
            <button
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-700"
            >
              مسح الكل
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-cream-50 px-3 py-2 text-sm"
              >
                <span dir="ltr" className="truncate flex-1">
                  {file.name}
                </span>
                <span className="mx-2 text-xs text-taupe">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="mt-4 w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-medium text-white transition hover:bg-maroon-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "جاري الرفع..." : `رفع ${files.length} ملف`}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-cream-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-bold text-maroon">تقرير الرفع</h3>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="rounded-lg bg-cream-50 p-3">
              <p className="text-2xl font-bold text-taupe">{result.total}</p>
              <p className="text-xs text-taupe">إجمالي</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-2xl font-bold text-green-700">{result.success}</p>
              <p className="text-xs text-green-600">نجاح</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">{result.failed}</p>
              <p className="text-xs text-red-600">فشل</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-700">{result.videos}</p>
              <p className="text-xs text-blue-600">فيديوهات</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-2xl font-bold text-green-700">{result.images}</p>
              <p className="text-xs text-green-600">صور</p>
            </div>
          </div>

          {result.results.filter((r) => r.status === "failed").length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-red-600">
                الملفات الفاشلة:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.results
                  .filter((r) => r.status === "failed")
                  .map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
                    >
                      <span dir="ltr" className="font-medium">
                        {r.fileName}
                      </span>
                      {r.orderNumber && (
                        <span className="mr-2 text-taupe">
                          (طلب: {r.orderNumber})
                        </span>
                      )}
                      <span className="mr-2">—</span>
                      <span>{r.reason}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {result.results.filter((r) => r.status === "success").length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-green-600">
                الملفات الناجحة:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.results
                  .filter((r) => r.status === "success")
                  .map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700"
                    >
                      <span dir="ltr" className="font-medium">
                        {r.fileName}
                      </span>
                      {r.orderNumber && (
                        <span className="mr-2 text-taupe">
                          → طلب: {r.orderNumber}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}