"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("بيانات الدخول غير صحيحة");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("خطأ في الخادم، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-bold text-maroon">
            تسجيل الدخول
          </h1>
          <p className="mt-1 text-sm text-taupe">توثيق أضحيتي</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-cream-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-taupe-700"
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
              dir="ltr"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-taupe-700"
            >
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-medium text-white transition hover:bg-maroon-800 disabled:opacity-50"
          >
            {loading ? "..." : "دخول"}
          </button>
        </form>
      </div>
    </main>
  );
}
