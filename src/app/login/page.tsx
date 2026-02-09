"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/ui/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.push(data.data.role === "GUARDIAN" ? "/guardian" : "/search");
        }
      } else {
        setError(data.error?.message || "로그인에 실패했습니다.");
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
      <Navbar />

      <div className="flex items-center justify-center min-h-screen px-6 pt-20">
        <div className="w-full max-w-[1620px] min-h-[690px] rounded-[18px] overflow-hidden flex flex-col md:flex-row shadow-xl">
          {/* Left branding */}
          <div className="w-full md:w-[810px] bg-[var(--color-primary)] flex flex-col items-center justify-center p-10 min-h-[300px] md:min-h-0">
            <h2
              className="font-heading font-bold text-white text-center leading-[1.2]"
              style={{ fontSize: "clamp(40px, 5vw, 80px)" }}
            >
              Welcome
              <br />
              Back
            </h2>
            <p className="font-heading font-bold text-white text-center text-xl md:text-3xl mt-8">
              다시 돌아오신 것을 환영합니다
            </p>
          </div>

          {/* Right form */}
          <div className="flex-1 bg-white p-8 md:p-14 flex flex-col justify-center">
            <form
              onSubmit={handleSubmit}
              className="max-w-[480px] mx-auto w-full space-y-6"
            >
              <h3 className="font-heading font-bold text-3xl text-black mb-8">
                로그인
              </h3>

              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[50px] rounded-[11px] border border-[var(--color-input-border)] bg-white px-5 font-body font-semibold text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                required
              />

              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[50px] rounded-[11px] border border-[var(--color-input-border)] bg-white px-5 font-body font-semibold text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                required
              />

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>

              {/* Google login */}
              <button
                type="button"
                className="w-full h-[50px] rounded-[7px] bg-white border border-gray-200 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
                <span className="font-body font-semibold text-sm text-black">
                  구글 계정으로 로그인
                </span>
              </button>

              <p className="text-center text-sm text-[#505050]/70">
                계정이 없나요?{" "}
                <a
                  href="/signup"
                  className="text-[var(--color-primary)] font-semibold hover:underline"
                >
                  회원가입
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
