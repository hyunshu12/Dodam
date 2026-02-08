"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [challenge, setChallenge] = useState<{
    question: string;
    tempToken: string;
  } | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setChallenge(null);
    setResults([]);

    try {
      const res = await fetch("/api/emergency/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputPhrase: query }),
      });
      const data = await res.json();

      if (data.ok) {
        if (data.data.mode === "SEARCH") {
          setResults(data.data.results || []);
        } else if (data.data.mode === "SECOND_FACTOR") {
          setChallenge({
            question: data.data.challenge.question,
            tempToken: data.data.tempToken,
          });
        }
      }
    } catch {
      // Silently fail - don't reveal system
    }
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || !answer.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/emergency/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: challenge.tempToken,
          answer,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        if (data.data.mode === "CHAT") {
          router.push(`/room/${data.data.roomId}`);
          return;
        } else if (data.data.mode === "SEARCH") {
          setChallenge(null);
          setResults(data.data.results || []);
        }
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
  }

  return (
    <div className="relative w-full min-h-screen bg-white flex flex-col">
      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Google-style logo */}
        <div className="mb-8">
          <svg
            width="434"
            height="147"
            viewBox="0 0 434 147"
            className="w-[280px] md:w-[434px]"
          >
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#4285F4"
              fontFamily="DM Sans, sans-serif"
              fontWeight="700"
              fontSize="100"
            >
              G
            </text>
            <text
              x="25%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#EA4335"
              fontFamily="DM Sans, sans-serif"
              fontWeight="700"
              fontSize="80"
              opacity="0"
            >
              o
            </text>
          </svg>
          {/* Use image-based logo like Figma or fallback text */}
          <h1
            className="text-center font-heading font-bold"
            style={{
              fontSize: "clamp(48px, 8vw, 100px)",
              background:
                "linear-gradient(90deg, #4285F4 0%, #EA4335 25%, #FBBC05 50%, #4285F4 75%, #34A853 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Google
          </h1>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full max-w-[984px] mb-8">
          <div className="relative flex items-center w-full h-[74px] rounded-[50px] border border-[#E0E1E5] bg-white shadow-sm hover:shadow-md transition-shadow">
            {/* Search icon */}
            <div className="pl-6 pr-3">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9AA0A6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 h-full bg-transparent text-lg font-body focus:outline-none"
              placeholder=""
              autoFocus
            />

            {/* Mic icon */}
            <div className="pr-6 pl-3 cursor-pointer">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="#4285F4"
              >
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
            </div>
          </div>

          {/* Hidden submit */}
          <button type="submit" className="hidden" />
        </form>

        {/* Second factor challenge - disguised as security check */}
        {challenge && (
          <div className="w-full max-w-[984px] bg-white rounded-[18px] border border-[#E0E1E5] p-8 mb-6 shadow-sm">
            <p className="text-sm text-[#5F6368] mb-2">보안 확인</p>
            <p className="font-body font-semibold text-lg mb-4">
              {challenge.question}
            </p>
            <form onSubmit={handleVerify} className="flex gap-3">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="답변 입력..."
                className="flex-1 h-[50px] rounded-[11px] border border-[var(--color-input-border)] px-4 font-body focus:outline-none focus:border-[var(--color-primary)]"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="h-[50px] px-8 rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold hover:opacity-90 disabled:opacity-50"
              >
                확인
              </button>
            </form>
          </div>
        )}

        {/* Search results (camouflage) */}
        {results.length > 0 && (
          <div className="w-full max-w-[984px] space-y-5">
            {results.map((r, i) => (
              <div key={i} className="px-2">
                <a
                  href={r.url}
                  className="text-[#1a0dab] hover:underline text-xl font-body font-medium"
                >
                  {r.title}
                </a>
                <p className="text-[#006621] text-sm font-body">{r.url}</p>
                <p className="text-[#545454] text-sm font-body mt-1">
                  {r.snippet}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Google style */}
      <footer className="w-full bg-[#F2F2F2]">
        <div className="border-b border-[#E4E4E4] px-8 py-4">
          <div className="flex flex-wrap gap-6">
            <span className="text-[#5F6368] font-body font-semibold text-sm cursor-pointer hover:underline">
              Advertising
            </span>
            <span className="text-[#5F6368] font-body font-semibold text-sm cursor-pointer hover:underline">
              Business
            </span>
            <span className="text-[#5F6368] font-body font-semibold text-sm cursor-pointer hover:underline">
              How search works
            </span>
            <span className="flex-1" />
            <span className="text-[#5F6368] font-body font-semibold text-sm cursor-pointer hover:underline">
              Privacy
            </span>
            <span className="text-[#5F6368] font-body font-semibold text-sm cursor-pointer hover:underline">
              Terms
            </span>
            <span className="text-[#5F6368] font-body font-semibold text-sm cursor-pointer hover:underline">
              Settings
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
