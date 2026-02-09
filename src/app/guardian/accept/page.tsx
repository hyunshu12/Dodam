"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Status = "loading" | "not_logged_in" | "not_guardian" | "ready" | "accepting" | "success" | "error";

export default function GuardianAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<Status>("loading");
  const [tokenInput, setTokenInput] = useState(token);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.ok && data.data) {
        if (data.data.role === "GUARDIAN") {
          setStatus("ready");
          // Auto-accept if token is in URL
          if (token) {
            acceptToken(token);
          }
        } else {
          setStatus("not_guardian");
        }
      } else {
        setStatus("not_logged_in");
      }
    } catch {
      setStatus("not_logged_in");
    }
  }

  const acceptToken = useCallback(async (t: string) => {
    if (!t.trim()) return;
    setStatus("accepting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/guardian/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t.trim() }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setStatus("error");
        setErrorMsg(`서버 응답 오류 (${res.status})`);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setSuccessMsg("초대를 성공적으로 수락했습니다! 이제 피해자와 연결되었습니다.");
      } else {
        setStatus("error");
        const code = data.error?.code;
        if (code === "NOT_FOUND") {
          setErrorMsg("유효하지 않은 초대 토큰입니다. 토큰을 다시 확인해주세요.");
        } else if (code === "ALREADY_ACCEPTED") {
          setErrorMsg("이미 수락된 초대입니다.");
        } else if (code === "EXPIRED") {
          setErrorMsg("만료된 초대입니다. 피해자에게 새 초대를 요청해주세요.");
        } else {
          setErrorMsg(data.error?.message || "초대 수락에 실패했습니다.");
        }
      }
    } catch {
      setStatus("error");
      setErrorMsg("서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.");
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    acceptToken(tokenInput);
  }

  return (
    <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
      <div className="flex items-center justify-center min-h-screen px-6 pt-20">
        <div className="w-full max-w-[540px] bg-white rounded-[18px] shadow-xl p-10">
          <h2 className="font-heading font-bold text-2xl text-black mb-2">
            보호자 초대 수락
          </h2>
          <p className="font-body text-[#505050]/70 text-sm mb-8">
            피해자로부터 받은 초대를 수락하여 보호자로 연결됩니다.
          </p>

          {/* Not logged in */}
          {status === "not_logged_in" && (
            <div className="space-y-5">
              <div className="px-4 py-4 rounded-[11px] bg-yellow-50 border border-yellow-200">
                <p className="text-yellow-800 text-sm font-body font-semibold mb-1">
                  로그인이 필요합니다
                </p>
                <p className="text-yellow-700 text-sm font-body">
                  보호자 계정으로 로그인하거나 새로 가입해주세요.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href={`/login?redirect=${encodeURIComponent(`/guardian/accept?token=${token}`)}`}
                  className="flex-1 h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-base flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  로그인
                </a>
                <a
                  href="/signup"
                  className="flex-1 h-[50px] rounded-[11px] border border-[var(--color-input-border)] text-[#505050] font-heading font-bold text-base flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  보호자 가입
                </a>
              </div>
            </div>
          )}

          {/* Not a guardian role */}
          {status === "not_guardian" && (
            <div className="space-y-5">
              <div className="px-4 py-4 rounded-[11px] bg-red-50 border border-red-200">
                <p className="text-red-700 text-sm font-body font-semibold mb-1">
                  보호자 계정이 아닙니다
                </p>
                <p className="text-red-600 text-sm font-body">
                  현재 로그인된 계정은 피해자 계정입니다. 보호자 계정으로 다시
                  로그인해주세요.
                </p>
              </div>
              <a
                href={`/login?redirect=${encodeURIComponent(`/guardian/accept?token=${token}`)}`}
                className="block w-full h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-base text-center leading-[50px] hover:opacity-90 transition-opacity"
              >
                다른 계정으로 로그인
              </a>
            </div>
          )}

          {/* Loading */}
          {status === "loading" && (
            <div className="text-center py-8">
              <p className="font-body text-[#505050]">확인 중...</p>
            </div>
          )}

          {/* Ready to accept */}
          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="font-body font-semibold text-sm text-black mb-1.5 block">
                  초대 토큰
                </label>
                <input
                  type="text"
                  placeholder="초대 토큰을 입력하세요"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full h-[50px] rounded-[11px] border border-[var(--color-input-border)] bg-white px-5 font-body text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="w-full h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                초대 수락
              </button>
            </form>
          )}

          {/* Accepting */}
          {status === "accepting" && (
            <div className="text-center py-8">
              <p className="font-body text-[#505050]">초대를 수락하는 중...</p>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="space-y-5">
              <div className="px-4 py-4 rounded-[11px] bg-green-50 border border-green-200">
                <p className="text-green-700 text-sm font-body font-semibold mb-1">
                  수락 완료
                </p>
                <p className="text-green-600 text-sm font-body">{successMsg}</p>
              </div>
              <button
                onClick={() => router.push("/guardian")}
                className="w-full h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-lg hover:opacity-90 transition-opacity"
              >
                보호자 대시보드로 이동
              </button>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="space-y-5">
              <div className="px-4 py-4 rounded-[11px] bg-red-50 border border-red-200">
                <p className="text-red-600 text-sm font-body">{errorMsg}</p>
              </div>
              <button
                onClick={() => setStatus("ready")}
                className="w-full h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-lg hover:opacity-90 transition-opacity"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
