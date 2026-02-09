"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StepInput from "@/components/ui/StepInput";

type Step = 1 | 2 | 3;
type Role = "VICTIM" | "GUARDIAN";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Role selection
  const [role, setRole] = useState<Role>("VICTIM");

  // Step 1: Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Step 2: User info
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3 (VICTIM): Guardian info
  const [guardianName, setGuardianName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Step 3 (GUARDIAN): Invite token
  const [inviteToken, setInviteToken] = useState("");

  // Demo: show generated invite token after signup
  const [generatedToken, setGeneratedToken] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  // ── Step 1 → Step 2 ─────────────────────
  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setStep(2);
  }

  // ── Step 2 → Step 3 ─────────────────────
  function handleStep2Next(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (phone.trim()) {
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        setError("전화번호는 10~11자리 숫자여야 합니다.");
        return;
      }
    }
    if (birthDate.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(birthDate)) {
        setError("생년월일은 YYYY-MM-DD 형식이어야 합니다.");
        return;
      }
      const parsed = new Date(birthDate);
      if (isNaN(parsed.getTime())) {
        setError("유효하지 않은 생년월일입니다.");
        return;
      }
    }

    setStep(3);
  }

  // ── Step 3 → Complete ───────────────────
  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1) Call signup API
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          role,
          phone: phone.trim() || undefined,
          birthDate: birthDate.trim() || undefined,
        }),
      });

      const contentType = signupRes.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setError(
          `서버 응답 오류 (${signupRes.status}). 페이지를 새로고침 후 다시 시도해주세요.`
        );
        setLoading(false);
        return;
      }

      const signupData = await signupRes.json();

      if (!signupData.ok) {
        if (
          ["DUPLICATE_EMAIL", "INVALID_EMAIL", "EMAIL_REQUIRED", "PASSWORD_REQUIRED", "PASSWORD_TOO_SHORT"].includes(
            signupData.error?.code
          )
        ) {
          setStep(1);
        }
        if (signupData.error?.code === "NAME_REQUIRED") {
          setStep(2);
        }
        setError(signupData.error?.message || "가입에 실패했습니다.");
        setLoading(false);
        return;
      }

      // 2) Role-specific post-signup actions
      if (role === "VICTIM") {
        // Invite guardian if info provided
        if (guardianPhone.trim()) {
          try {
            const inviteRes = await fetch("/api/victim/guardians/invite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phone: guardianPhone.replace(/\D/g, ""),
                relationship: relationship.trim() || "보호자",
                alias: guardianName.trim() || undefined,
              }),
            });
            const inviteData = await inviteRes.json();
            if (inviteData.ok && inviteData.data?.token) {
              // Demo mode: show token on screen
              setGeneratedToken(inviteData.data.token);
              setSignupComplete(true);
              setLoading(false);
              return; // Don't redirect yet — show token first
            }
          } catch {
            console.warn("보호자 초대 요청 실패 (가입은 완료됨)");
          }
        }
        router.push("/settings");
      } else {
        // GUARDIAN: accept invite token if provided
        if (inviteToken.trim()) {
          try {
            const acceptRes = await fetch("/api/guardian/invitations/accept", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: inviteToken.trim() }),
            });
            const acceptData = await acceptRes.json();
            if (!acceptData.ok) {
              // Non-critical: show warning but still redirect
              console.warn("초대 수락 실패:", acceptData.error?.message);
            }
          } catch {
            console.warn("초대 수락 요청 실패 (가입은 완료됨)");
          }
        }
        router.push("/guardian");
      }
    } catch (err) {
      console.error("[signup] fetch error:", err);
      setError(
        "서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요."
      );
    }
    setLoading(false);
  }

  // ── Step indicator ──────────────────────
  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (s < step) setStep(s as Step);
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-heading font-bold text-sm transition-all ${
                s === step
                  ? "bg-[var(--color-primary)] text-white scale-110"
                  : s < step
                    ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] cursor-pointer hover:bg-[var(--color-primary)]/30"
                    : "bg-gray-200 text-gray-400"
              }`}
            >
              {s < step ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                s
              )}
            </button>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  s < step ? "bg-[var(--color-primary)]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Branding panel content per step ────────
  function getBrandingPanelContent() {
    switch (step) {
      case 1:
        return {
          title: (
            <>
              Create your
              <br />
              Account
            </>
          ),
          subtitle: "이메일과 비밀번호로 가입하세요",
        };
      case 2:
      case 3:
        return {
          title: (
            <>
              Welcome To
              <br />
              DODAM
            </>
          ),
          subtitle: "정보를 입력해주세요",
        };
    }
  }

  const panel = getBrandingPanelContent();

  // ── Copy token to clipboard ────────────
  async function handleCopyToken() {
    try {
      await navigator.clipboard.writeText(generatedToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      // Fallback: select text
      const el = document.getElementById("demo-token-display");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  // ── Copy invite link to clipboard ────────────
  async function handleCopyLink() {
    const link = `${window.location.origin}/guardian/accept?token=${generatedToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  // ── Demo: Token display screen after signup ──
  if (signupComplete && generatedToken) {
    return (
      <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
        <div className="flex items-center justify-center min-h-screen px-6 pt-20">
          <div className="w-full max-w-[720px] rounded-[18px] overflow-hidden shadow-xl reveal-scale bg-white p-8 md:p-14">
            {/* Success icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <h3 className="font-heading font-bold text-2xl text-black text-center mb-2">
              회원가입 완료!
            </h3>
            <p className="font-body text-[#505050]/70 text-sm text-center mb-8">
              보호자 초대가 생성되었습니다. 아래 토큰을 보호자에게 전달해주세요.
            </p>

            {/* Token display */}
            <div className="bg-[var(--color-bg-light)] rounded-[11px] border-2 border-dashed border-[var(--color-primary)]/30 p-6 mb-4">
              <label className="font-body font-semibold text-xs text-[#505050]/60 uppercase tracking-wider mb-2 block">
                보호자 초대 토큰 (DEMO)
              </label>
              <div
                id="demo-token-display"
                className="font-mono text-lg text-[var(--color-primary)] font-bold break-all select-all leading-relaxed"
              >
                {generatedToken}
              </div>
            </div>

            {/* Copy buttons */}
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={handleCopyToken}
                className="flex-1 h-[46px] rounded-[11px] border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-heading font-bold text-sm hover:bg-[var(--color-primary)]/5 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {tokenCopied ? "복사됨!" : "토큰 복사"}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 h-[46px] rounded-[11px] border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-heading font-bold text-sm hover:bg-[var(--color-primary)]/5 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                {tokenCopied ? "복사됨!" : "초대 링크 복사"}
              </button>
            </div>

            {/* Info box */}
            <div className="px-4 py-3 rounded-[11px] bg-amber-50 border border-amber-200 mb-6">
              <p className="text-amber-700 text-sm font-body">
                <span className="font-semibold">데모 안내:</span> 실제 서비스에서는 SMS로 자동 전송됩니다. 데모에서는 이 토큰을 보호자에게 직접 전달하세요. 보호자는 회원가입 시 이 토큰을 입력하면 연결됩니다.
              </p>
            </div>

            {/* Continue button */}
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="w-full h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-lg hover:opacity-90 transition-opacity"
            >
              설정 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
      <div className="flex items-center justify-center min-h-screen px-6 pt-20">
        <div className="w-full max-w-[1620px] min-h-[690px] rounded-[18px] overflow-hidden flex flex-col md:flex-row shadow-xl reveal-scale">
          {/* ─── Step 1: Branding LEFT, Form RIGHT (Figma 로그인화면1) ─── */}
          {step === 1 && (
            <>
              {/* Left branding panel */}
              <div className="w-full md:w-[810px] bg-[var(--color-primary)] flex flex-col items-center justify-center p-10 min-h-[300px] md:min-h-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none">
                    <circle cx="100" cy="200" r="150" stroke="white" strokeWidth="1" />
                    <circle cx="300" cy="200" r="150" stroke="white" strokeWidth="1" />
                    <circle cx="200" cy="100" r="150" stroke="white" strokeWidth="1" />
                    <circle cx="200" cy="300" r="150" stroke="white" strokeWidth="1" />
                  </svg>
                </div>
                <div className="relative z-10 text-center">
                  <h2
                    className="font-heading font-bold text-white leading-[1.2]"
                    style={{ fontSize: "clamp(40px, 5vw, 80px)" }}
                  >
                    {panel.title}
                  </h2>
                  <p className="font-heading font-bold text-white text-lg md:text-3xl mt-8">
                    {panel.subtitle}
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-10">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`rounded-full transition-all ${
                          s === step
                            ? "w-8 h-3 bg-white"
                            : s < step
                              ? "w-3 h-3 bg-white/60"
                              : "w-3 h-3 bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right form panel */}
              <div className="flex-1 bg-white p-8 md:p-14 flex flex-col justify-center">
                <StepIndicator />
                <form
                  onSubmit={handleStep1Next}
                  className="max-w-[480px] mx-auto w-full space-y-5"
                >
                  <h3 className="font-heading font-bold text-2xl text-black mb-2">
                    계정 만들기
                  </h3>
                  <p className="font-body text-[#505050]/70 text-sm mb-6">
                    이메일, 비밀번호를 입력하고 역할을 선택하세요.
                  </p>

                  {/* Role selector */}
                  <div>
                    <label className="font-body font-semibold text-sm text-black mb-2 block">
                      가입 유형
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("VICTIM")}
                        className={`flex-1 h-[50px] rounded-[11px] border-2 font-heading font-bold text-base transition-all ${
                          role === "VICTIM"
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                            : "border-gray-200 text-[#505050] hover:border-gray-300"
                        }`}
                      >
                        피해자 (도움 요청)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("GUARDIAN")}
                        className={`flex-1 h-[50px] rounded-[11px] border-2 font-heading font-bold text-base transition-all ${
                          role === "GUARDIAN"
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                            : "border-gray-200 text-[#505050] hover:border-gray-300"
                        }`}
                      >
                        보호자 (도움 제공)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-body font-semibold text-sm text-black mb-1.5 block">
                      이메일
                    </label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-[50px] rounded-[11px] border border-[var(--color-input-border)] bg-white px-5 font-body text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="font-body font-semibold text-sm text-black mb-1.5 block">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      placeholder="6자 이상"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-[50px] rounded-[11px] border border-[var(--color-input-border)] bg-white px-5 font-body text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-body font-semibold text-sm text-black mb-1.5 block">
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      placeholder="비밀번호를 다시 입력해주세요"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="w-full h-[50px] rounded-[11px] border border-[var(--color-input-border)] bg-white px-5 font-body text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="px-4 py-3 rounded-[11px] bg-red-50 border border-red-200">
                      <p className="text-red-600 text-sm font-body">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-lg hover:opacity-90 transition-opacity"
                  >
                    다음
                  </button>

                  <p className="text-center text-sm text-[#505050]/70 font-body">
                    이미 계정이 있나요?{" "}
                    <Link
                      href="/login"
                      className="text-[var(--color-primary)] font-semibold hover:underline"
                    >
                      로그인
                    </Link>
                  </p>
                </form>
              </div>
            </>
          )}

          {/* ─── Step 2-3: Form LEFT, Branding RIGHT (Figma 로그인화면2,3) ─── */}
          {step !== 1 && (
            <>
              {/* Left form panel */}
              <div className="flex-1 bg-white p-8 md:p-14 flex flex-col justify-center">
                <StepIndicator />

                {/* ─── Step 2: User Info ─── */}
                {step === 2 && (
                  <form
                    onSubmit={handleStep2Next}
                    className="max-w-[615px] mx-auto w-full space-y-7"
                  >
                    <div className="mb-2">
                      <h3 className="font-heading font-bold text-2xl text-black">
                        사용자 정보
                      </h3>
                      <p className="font-body text-[#505050]/70 text-sm mt-1">
                        이름은 필수, 나머지는 선택 항목입니다.
                      </p>
                    </div>

                    <StepInput
                      step={1}
                      label="이름을 입력하세요"
                      placeholder="본명을 입력해주세요"
                      value={displayName}
                      onChange={setDisplayName}
                    />
                    <StepInput
                      step={2}
                      label="생년월일을 입력하세요"
                      placeholder="YYYY-MM-DD"
                      value={birthDate}
                      onChange={setBirthDate}
                    />
                    <StepInput
                      step={3}
                      label="전화번호를 입력하세요"
                      placeholder="'-'없이 숫자만 입력해주세요"
                      value={phone}
                      onChange={setPhone}
                      type="tel"
                    />

                    {error && (
                      <div className="px-4 py-3 rounded-[11px] bg-red-50 border border-red-200">
                        <p className="text-red-600 text-sm font-body">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setStep(1);
                        }}
                        className="h-[50px] px-8 rounded-[11px] border border-[var(--color-input-border)] text-[#505050] font-heading font-bold text-lg hover:bg-gray-50 transition-colors"
                      >
                        이전
                      </button>
                      <button
                        type="submit"
                        className="flex-1 h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-lg hover:opacity-90 transition-opacity"
                      >
                        다음
                      </button>
                    </div>
                  </form>
                )}

                {/* ─── Step 3: Role-specific ─── */}
                {step === 3 && (
                  <form
                    onSubmit={handleComplete}
                    className="max-w-[615px] mx-auto w-full space-y-7"
                  >
                    {role === "VICTIM" ? (
                      <>
                        <div className="mb-2">
                          <h3 className="font-heading font-bold text-2xl text-black">
                            보호자 정보
                          </h3>
                          <p className="font-body text-[#505050]/70 text-sm mt-1">
                            위기 상황 시 연락받을 보호자 정보입니다. 나중에 설정할
                            수도 있습니다.
                          </p>
                        </div>

                        <StepInput
                          step={4}
                          label="보호자 이름을 입력하세요"
                          placeholder="본명을 입력해주세요"
                          value={guardianName}
                          onChange={setGuardianName}
                        />
                        <StepInput
                          step={5}
                          label="사용자와 관계를 입력하세요"
                          placeholder="관계를 입력해주세요"
                          value={relationship}
                          onChange={setRelationship}
                        />
                        <StepInput
                          step={6}
                          label="보호자 전화번호를 입력하세요"
                          placeholder="'-'없이 숫자만 입력해주세요"
                          value={guardianPhone}
                          onChange={setGuardianPhone}
                          type="tel"
                        />
                      </>
                    ) : (
                      <>
                        <div className="mb-2">
                          <h3 className="font-heading font-bold text-2xl text-black">
                            초대 수락
                          </h3>
                          <p className="font-body text-[#505050]/70 text-sm mt-1">
                            피해자로부터 받은 초대 토큰을 입력하세요. 토큰이 없으면
                            건너뛸 수 있습니다.
                          </p>
                        </div>

                        <StepInput
                          step={4}
                          label="초대 토큰을 입력하세요"
                          placeholder="피해자로부터 받은 토큰 (선택)"
                          value={inviteToken}
                          onChange={setInviteToken}
                        />

                        <div className="px-4 py-3 rounded-[11px] bg-blue-50 border border-blue-200">
                          <p className="text-blue-700 text-sm font-body">
                            토큰이 없어도 가입할 수 있습니다. 나중에 설정 페이지에서
                            입력하거나, 피해자가 보낸 초대 링크로 수락할 수
                            있습니다.
                          </p>
                        </div>
                      </>
                    )}

                    {error && (
                      <div className="px-4 py-3 rounded-[11px] bg-red-50 border border-red-200">
                        <p className="text-red-600 text-sm font-body">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setStep(2);
                        }}
                        className="h-[50px] px-8 rounded-[11px] border border-[var(--color-input-border)] text-[#505050] font-heading font-bold text-lg hover:bg-gray-50 transition-colors"
                      >
                        이전
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-[50px] rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {loading ? "가입 처리 중..." : "완료"}
                      </button>
                    </div>

                    {role === "VICTIM" &&
                      !guardianPhone.trim() &&
                      !guardianName.trim() &&
                      !relationship.trim() && (
                        <p className="text-center text-xs text-[#848484] font-body">
                          보호자 정보 없이 &quot;완료&quot;를 누르면 건너뛸 수
                          있습니다.
                        </p>
                      )}
                  </form>
                )}
              </div>

              {/* Right branding panel */}
              <div className="w-full md:w-[810px] bg-[var(--color-primary)] flex flex-col items-center justify-center p-10 min-h-[300px] md:min-h-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none">
                    <circle cx="100" cy="200" r="150" stroke="white" strokeWidth="1" />
                    <circle cx="300" cy="200" r="150" stroke="white" strokeWidth="1" />
                    <circle cx="200" cy="100" r="150" stroke="white" strokeWidth="1" />
                    <circle cx="200" cy="300" r="150" stroke="white" strokeWidth="1" />
                  </svg>
                </div>
                <div className="relative z-10 text-center">
                  <h2
                    className="font-heading font-bold text-white leading-[1.2]"
                    style={{ fontSize: "clamp(40px, 5vw, 80px)" }}
                  >
                    {panel.title}
                  </h2>
                  <p className="font-heading font-bold text-white text-lg md:text-3xl mt-8">
                    {panel.subtitle}
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-10">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`rounded-full transition-all ${
                          s === step
                            ? "w-8 h-3 bg-white"
                            : s < step
                              ? "w-3 h-3 bg-white/60"
                              : "w-3 h-3 bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
