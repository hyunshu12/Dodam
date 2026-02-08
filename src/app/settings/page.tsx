"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/ui/Navbar";

interface Guardian {
  id: string;
  guardianId: string | null;
  guardianName: string | null;
  relationship: string;
  alias: string | null;
  status: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<{
    id: string;
    role: string;
    displayName: string | null;
  } | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [codeConfig, setCodeConfig] = useState<{ hasCode: boolean } | null>(
    null
  );

  // Invite form
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRelation, setInviteRelation] = useState("");
  const [inviteAlias, setInviteAlias] = useState("");
  const [inviteResult, setInviteResult] = useState("");

  // Code form
  const [primaryPhrase, setPrimaryPhrase] = useState("");
  const [duressPhrase, setDuressPhrase] = useState("");
  const [sfQuestion, setSfQuestion] = useState("");
  const [sfAnswer, setSfAnswer] = useState("");
  const [codeResult, setCodeResult] = useState("");

  // Guardian accept form
  const [acceptToken, setAcceptToken] = useState("");
  const [acceptResult, setAcceptResult] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.ok) {
        setUser(data.data);
        if (data.data.role === "VICTIM") {
          loadGuardians();
          loadCodeConfig();
        }
      }
    } catch {
      // not logged in
    }
  }

  async function loadGuardians() {
    const res = await fetch("/api/victim/guardians");
    const data = await res.json();
    if (data.ok) setGuardians(data.data);
  }

  async function loadCodeConfig() {
    const res = await fetch("/api/victim/code-config");
    const data = await res.json();
    if (data.ok) setCodeConfig(data.data);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteResult("");
    const res = await fetch("/api/victim/guardians/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: invitePhone,
        relationship: inviteRelation,
        alias: inviteAlias || undefined,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setInviteResult(`초대 완료! 토큰: ${data.data.token}`);
      setInvitePhone("");
      setInviteRelation("");
      setInviteAlias("");
      loadGuardians();
    } else {
      setInviteResult(data.error?.message || "오류가 발생했습니다.");
    }
  }

  async function handleCodeSave(e: React.FormEvent) {
    e.preventDefault();
    setCodeResult("");
    const res = await fetch("/api/victim/code-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryPhrase,
        duressPhrase: duressPhrase || undefined,
        secondFactorQuestion: sfQuestion,
        secondFactorAnswer: sfAnswer,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setCodeResult("코드 설정 완료!");
      setPrimaryPhrase("");
      setDuressPhrase("");
      setSfQuestion("");
      setSfAnswer("");
      loadCodeConfig();
    } else {
      setCodeResult(data.error?.message || "오류가 발생했습니다.");
    }
  }

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    setAcceptResult("");
    const res = await fetch("/api/guardian/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: acceptToken }),
    });
    const data = await res.json();
    if (data.ok) {
      setAcceptResult("초대 수락 완료!");
      setAcceptToken("");
    } else {
      setAcceptResult(data.error?.message || "오류가 발생했습니다.");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="font-body text-[#505050] text-lg mb-4">
              로그인이 필요합니다.
            </p>
            <a
              href="/login"
              className="inline-block px-8 py-3 rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold hover:opacity-90"
            >
              로그인
            </a>
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full h-[50px] rounded-[11px] border border-[var(--color-input-border)] bg-white px-5 font-body font-semibold text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors";
  const btnPrimary =
    "px-6 py-3 rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold hover:opacity-90 transition-opacity";

  return (
    <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-12 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="font-heading font-bold text-3xl text-black">설정</h1>
          <div className="flex items-center gap-4">
            <span className="font-body text-sm text-[#505050]">
              {user.displayName || user.id} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-[11px] border border-[var(--color-input-border)] font-body font-semibold text-sm text-[#505050] hover:bg-white transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* VICTIM settings */}
        {user.role === "VICTIM" && (
          <>
            {/* Guardian invite */}
            <section className="bg-white rounded-[18px] shadow-sm p-8">
              <h2 className="font-heading font-bold text-xl text-black mb-6">
                보호자 초대
              </h2>
              <form onSubmit={handleInvite} className="space-y-4">
                <input
                  type="tel"
                  placeholder="보호자 전화번호"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  placeholder="관계 (예: 부모, 배우자, 친구)"
                  value={inviteRelation}
                  onChange={(e) => setInviteRelation(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  placeholder="별칭 (선택)"
                  value={inviteAlias}
                  onChange={(e) => setInviteAlias(e.target.value)}
                  className={inputClass}
                />
                <button type="submit" className={btnPrimary}>
                  초대하기
                </button>
                {inviteResult && (
                  <p className="font-body text-sm text-[var(--color-primary)]">
                    {inviteResult}
                  </p>
                )}
              </form>

              {guardians.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="font-heading font-semibold text-sm text-[#505050] mb-3">
                    등록된 보호자
                  </h3>
                  <ul className="space-y-2">
                    {guardians.map((g) => (
                      <li
                        key={g.id}
                        className="flex items-center gap-3 font-body text-sm"
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            g.status === "ACTIVE"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                        />
                        <span className="text-black">
                          {g.alias || g.guardianName || "미수락"}
                        </span>
                        <span className="text-[#505050]">
                          ({g.relationship})
                        </span>
                        <span className="text-[#848484] text-xs">
                          {g.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Code config */}
            <section className="bg-white rounded-[18px] shadow-sm p-8">
              <h2 className="font-heading font-bold text-xl text-black mb-6">
                약속 코드 설정
              </h2>
              {codeConfig?.hasCode && (
                <div className="mb-4 px-4 py-2 rounded-[11px] bg-green-50 text-green-700 font-body text-sm">
                  코드가 설정되어 있습니다.
                </div>
              )}
              <form onSubmit={handleCodeSave} className="space-y-4">
                <input
                  type="text"
                  placeholder="약속 코드 (짧은 문장)"
                  value={primaryPhrase}
                  onChange={(e) => setPrimaryPhrase(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  placeholder="듀레스 코드 (선택, 겉보기 정상)"
                  value={duressPhrase}
                  onChange={(e) => setDuressPhrase(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="보안 질문 (예: 우리 강아지 이름은?)"
                  value={sfQuestion}
                  onChange={(e) => setSfQuestion(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  placeholder="보안 질문 답변"
                  value={sfAnswer}
                  onChange={(e) => setSfAnswer(e.target.value)}
                  className={inputClass}
                  required
                />
                <button type="submit" className={btnPrimary}>
                  코드 저장
                </button>
                {codeResult && (
                  <p className="font-body text-sm text-[var(--color-primary)]">
                    {codeResult}
                  </p>
                )}
              </form>
            </section>
          </>
        )}

        {/* GUARDIAN settings */}
        {user.role === "GUARDIAN" && (
          <section className="bg-white rounded-[18px] shadow-sm p-8">
            <h2 className="font-heading font-bold text-xl text-black mb-6">
              초대 수락
            </h2>
            <form onSubmit={handleAcceptInvite} className="space-y-4">
              <input
                type="text"
                placeholder="초대 토큰"
                value={acceptToken}
                onChange={(e) => setAcceptToken(e.target.value)}
                className={inputClass}
                required
              />
              <button type="submit" className={btnPrimary}>
                수락하기
              </button>
              {acceptResult && (
                <p className="font-body text-sm text-[var(--color-primary)]">
                  {acceptResult}
                </p>
              )}
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
