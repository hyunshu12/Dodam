"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import StepInput from "@/components/ui/StepInput";

type Step = 1 | 2 | 3;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2: User info
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3: Guardian info
  const [guardianName, setGuardianName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Auth (kept for API compatibility)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleGoogleSignup() {
    // For MVP: proceed to step 2 (actual Google OAuth can be added later)
    setStep(2);
  }

  async function handleStep2Next(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !phone.trim()) {
      setError("이름과 전화번호를 입력해주세요.");
      return;
    }
    setError("");
    setStep(3);
  }

  async function handleStep3Complete(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Signup as VICTIM with collected info
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || `user_${Date.now()}@dodam.app`,
          password: password || `temp_${Date.now()}`,
          displayName,
          role: "VICTIM",
        }),
      });
      const signupData = await signupRes.json();

      if (!signupData.ok) {
        setError(signupData.error?.message || "가입에 실패했습니다.");
        setLoading(false);
        return;
      }

      // If guardian info provided, invite guardian
      if (guardianPhone.trim()) {
        await fetch("/api/victim/guardians/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: guardianPhone,
            relationship: relationship || "보호자",
            alias: guardianName || undefined,
          }),
        });
      }

      router.push("/settings");
    } catch {
      setError("서버 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
      <Navbar />

      <div className="flex items-center justify-center min-h-screen px-6 pt-20">
        {/* Card container */}
        <div className="w-full max-w-[1620px] min-h-[690px] rounded-[18px] overflow-hidden flex flex-col md:flex-row shadow-xl">
          {/* ─── Left side (form) ─── */}
          <div className="flex-1 bg-white p-8 md:p-14 flex flex-col justify-center">
            {step === 1 && (
              <div className="max-w-[480px] mx-auto w-full space-y-6">
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="이메일 (선택)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-[67px] rounded-[7px] border border-gray-200 bg-white px-5 font-body font-semibold text-base focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Google login button */}
                <button
                  onClick={handleGoogleSignup}
                  className="w-full h-[67px] rounded-[7px] bg-white border border-gray-200 flex items-center justify-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <svg
                    width="35"
                    height="35"
                    viewBox="0 0 48 48"
                    className="flex-shrink-0"
                  >
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
                  <span className="font-body font-semibold text-xl text-black">
                    구글 계정으로 계속하기
                  </span>
                </button>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}
              </div>
            )}

            {step === 2 && (
              <form
                onSubmit={handleStep2Next}
                className="max-w-[615px] mx-auto w-full space-y-8"
              >
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

                {/* Password (hidden but needed for API) */}
                <input type="hidden" value={password} />

                <button
                  type="submit"
                  className="w-full h-10 rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-xl hover:opacity-90 transition-opacity"
                >
                  다음
                </button>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}
              </form>
            )}

            {step === 3 && (
              <form
                onSubmit={handleStep3Complete}
                className="max-w-[615px] mx-auto w-full space-y-8"
              >
                <StepInput
                  step={1}
                  label="보호자 이름을 입력하세요"
                  placeholder="본명을 입력해주세요"
                  value={guardianName}
                  onChange={setGuardianName}
                />
                <StepInput
                  step={2}
                  label="사용자와 관계를 입력하세요"
                  placeholder="관계를 입력해주세요"
                  value={relationship}
                  onChange={setRelationship}
                />
                <StepInput
                  step={3}
                  label="보호자 전화번호를 입력하세요"
                  placeholder="'-'없이 숫자만 입력해주세요"
                  value={guardianPhone}
                  onChange={setGuardianPhone}
                  type="tel"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? "처리 중..." : "완료"}
                </button>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}
              </form>
            )}
          </div>

          {/* ─── Right side (branding) ─── */}
          <div className="w-full md:w-[810px] bg-[var(--color-primary)] flex flex-col items-center justify-center p-10 min-h-[300px] md:min-h-0">
            <h2 className="font-heading font-bold text-white text-center leading-[1.2]"
              style={{ fontSize: "clamp(40px, 5vw, 80px)" }}
            >
              {step === 1 ? (
                <>
                  Creat your
                  <br />
                  Account
                </>
              ) : (
                <>
                  Welcome To
                  <br />
                  DODAM
                </>
              )}
            </h2>
            <p className="font-heading font-bold text-white text-center text-xl md:text-3xl mt-8">
              {step === 1
                ? "구글 계정으로 회원가입하세요"
                : "정보를 입력해주세요"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
