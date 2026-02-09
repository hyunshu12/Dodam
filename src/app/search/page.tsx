"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface Message {
  id: string;
  sender: { id: string; displayName: string | null; role: string };
  type: string;
  content: string | null;
  createdAt: string;
}

const PRESETS = [
  { key: "HELP", label: "도움 요청" },
  { key: "SAFE", label: "안전합니다" },
  { key: "CALL_POLICE", label: "경찰 신고" },
  { key: "CANT_TALK", label: "통화 불가" },
  { key: "MONEY_REQUEST", label: "돈 요구 중" },
  { key: "SUSPICIOUS_LINK", label: "의심 링크" },
];

// Fake URLs to disguise messages as search results
const FAKE_DOMAINS = [
  "www.naver.com",
  "ko.wikipedia.org",
  "www.daum.net",
  "blog.naver.com",
  "news.naver.com",
  "m.cafe.naver.com",
  "www.tistory.com",
  "brunch.co.kr",
];

function fakeUrl(index: number): string {
  return `https://${FAKE_DOMAINS[index % FAKE_DOMAINS.length]} › ...`;
}

function fakeTitle(msg: Message): string {
  const time = new Date(msg.createdAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const name = msg.sender.displayName || "보호자";
  return `${name} - ${time}`;
}

// Hoisted outside component to avoid re-creation (Rule 5.4, 6.3)
const EMERGENCY_HEADERS: HeadersInit = { "x-emergency-session": "true" };
const SEND_HEADERS: HeadersInit = { "Content-Type": "application/json", "x-emergency-session": "true" };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [challenge, setChallenge] = useState<{
    question: string;
    tempToken: string;
  } | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── Chat mode state ───
  const [chatMode, setChatMode] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [presetIndex, setPresetIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // emergencyHeaders hoisted to module scope as EMERGENCY_HEADERS

  // ─── Message polling (chat mode only) ───
  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`, {
        headers: EMERGENCY_HEADERS,
      });
      const data = await res.json();
      if (data.ok) {
        setMessages(data.data.messages);
      }
    } catch {
      // ignore
    }
  }, [roomId]);

  useEffect(() => {
    if (!chatMode || !roomId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [chatMode, roomId, loadMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Fallback: load my user ID from /api/auth/me if not set by verify response
  useEffect(() => {
    if (!chatMode || myUserId) return;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: EMERGENCY_HEADERS,
        });
        const data = await res.json();
        if (data.ok) setMyUserId(data.data.id);
      } catch {
        // ignore
      }
    })();
  }, [chatMode, myUserId]);

  // ─── Search / Code phrase entry ───
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    // If in chat mode, send a message instead
    if (chatMode) {
      await sendTextMessage(query);
      setQuery("");
      return;
    }

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

  // ─── Second factor verification ───
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
          // Set userId directly from verify response (avoids cookie timing issues)
          if (data.data.userId) {
            setMyUserId(data.data.userId);
          }
          // Activate chat mode instead of redirecting
          setChatMode(true);
          setRoomId(data.data.roomId);
          setChallenge(null);
          setResults([]);
          setQuery("");
          setAnswer("");
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

  // ─── Send text message ───
  async function sendTextMessage(text: string) {
    if (!text.trim() || !roomId) return;
    setLoading(true);
    try {
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: SEND_HEADERS,
        body: JSON.stringify({ type: "TEXT", text }),
      });
      await loadMessages();
    } catch {
      // ignore
    }
    setLoading(false);
  }

  // ─── Send preset message ───
  async function sendPreset() {
    if (!roomId) return;
    const preset = PRESETS[presetIndex];
    setPresetIndex((prev) => (prev + 1) % PRESETS.length);
    setLoading(true);
    try {
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: SEND_HEADERS,
        body: JSON.stringify({ presetKey: preset.key }),
      });
      await loadMessages();
    } catch {
      // ignore
    }
    setLoading(false);
  }

  // ─── Messages sorted chronologically for interleaved display (Rule 7.12: toSorted) ───
  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messages]
  );

  return (
    <div className="relative w-full min-h-screen bg-white flex flex-col">
      {/* ─── Top nav bar ─── */}
      <div className="flex items-center justify-end gap-4 px-4 py-2.5">
        <a href="#" className="text-[13px] text-[#222] hover:underline">
          Gmail
        </a>
        <a href="#" className="text-[13px] text-[#222] hover:underline">
          이미지
        </a>
        {/* Grid icon */}
        <button className="p-2 rounded-full hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F6368">
            <path d="M6,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2z" />
          </svg>
        </button>
        {/* Profile circle */}
        <div className="w-8 h-8 rounded-full bg-[#1A73E8] flex items-center justify-center cursor-pointer">
          <span className="text-white text-sm font-medium">D</span>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div
        className={`flex-1 flex flex-col items-center px-6 ${
          chatMode ? "pt-6" : "pt-[100px]"
        }`}
      >
        {/* Google Logo - smaller in chat mode */}
        <div
          className={`select-none ${chatMode ? "mb-4" : "mb-7"}`}
          aria-label="Google"
        >
          <span
            className={`leading-none tracking-[-2px] ${
              chatMode ? "text-[44px]" : "text-[92px]"
            }`}
            style={{ fontFamily: "'Product Sans', Arial, sans-serif" }}
          >
            <span style={{ color: "#4285F4" }}>G</span>
            <span style={{ color: "#EA4335" }}>o</span>
            <span style={{ color: "#FBBC05" }}>o</span>
            <span style={{ color: "#4285F4" }}>g</span>
            <span style={{ color: "#34A853" }}>l</span>
            <span style={{ color: "#EA4335" }}>e</span>
          </span>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full max-w-[584px] mb-8">
          <div className="relative flex items-center w-full h-[44px] rounded-full border border-[#dfe1e5] bg-white hover:shadow-md hover:border-transparent focus-within:shadow-md focus-within:border-transparent transition-all">
            {/* Search icon */}
            <div className="pl-3.5 pr-3 flex items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  fill="#9AA0A6"
                />
              </svg>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={chatMode ? "메시지를 입력하세요..." : ""}
              className="flex-1 h-full bg-transparent text-[16px] text-[#222] focus:outline-none"
              autoFocus
            />

            {/* Voice search icon */}
            <div className="px-2 cursor-pointer flex items-center">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path
                  fill="#4285f4"
                  d="m12 15c1.66 0 3-1.31 3-2.97v-7.02c0-1.66-1.34-3.01-3-3.01s-3 1.34-3 3.01v7.02c0 1.66 1.34 2.97 3 2.97z"
                />
                <path fill="#34a853" d="m11 18.08h2v3.92h-2z" />
                <path
                  fill="#fbbc04"
                  d="m7.05 16.87c-1.29-1.52-2.05-3.45-2.05-5.57h2c0 1.52.59 2.93 1.63 4l-1.58 1.57z"
                />
                <path
                  fill="#ea4335"
                  d="m12 16.93a6.28 6.28 0 0 0 4.95-2.63l1.58 1.57c-1.56 1.84-3.86 3.05-6.53 3.18v-2.12z"
                />
                <path
                  fill="#4285f4"
                  d="m14.97 11.3c0 0 0 .01 0 .02-.01.18-.02.36-.05.53-.17 1.12-.72 2.1-1.51 2.82l1.58 1.57c1.22-1.15 2.04-2.72 2.2-4.49h-2.22z"
                />
              </svg>
            </div>

            {/* Lens icon */}
            <div className="pr-3.5 cursor-pointer flex items-center">
              <svg width="24" height="24" viewBox="0 0 192 192">
                <rect fill="none" height="192" width="192" />
                <g>
                  <circle fill="#4285f4" cx="96" cy="104.15" r="28" />
                  <path
                    d="M160,72v40c0,33.14-26.86,60-60,60h-8c-33.14,0-60-26.86-60-60V72c0-33.14,26.86-60,60-60h8 C133.14,12,160,38.86,160,72z"
                    fill="none"
                    stroke="#34a853"
                    strokeWidth="16"
                  />
                  <rect
                    fill="#ea4335"
                    height="20"
                    rx="10"
                    width="80"
                    x="56"
                    y="1"
                  />
                  <rect
                    fill="#fbbc04"
                    height="80"
                    rx="10"
                    width="20"
                    x="167"
                    y="52"
                  />
                </g>
              </svg>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-3 mt-7">
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded bg-[#f8f9fa] border border-[#f8f9fa] text-[14px] text-[#3c4043] hover:border-[#dadce0] hover:shadow-sm disabled:opacity-50 transition-all"
            >
              Google 검색
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={chatMode ? sendPreset : undefined}
              className="h-9 px-4 rounded bg-[#f8f9fa] border border-[#f8f9fa] text-[14px] text-[#3c4043] hover:border-[#dadce0] hover:shadow-sm disabled:opacity-50 transition-all"
              title={
                chatMode
                  ? `빠른 메시지: ${PRESETS[presetIndex].label}`
                  : undefined
              }
            >
              {chatMode
                ? `I'm Feeling Lucky`
                : "I\u0027m Feeling Lucky"}
            </button>
          </div>
        </form>

        {/* ─── Chat mode: info bar showing next preset hint ─── */}
        {chatMode && (
          <div className="w-full max-w-[584px] text-[13px] text-[#70757a] mb-4">
            검색결과 약 {messages.length.toLocaleString()}개 (
            {(Math.random() * 0.5 + 0.1).toFixed(2)}초)
            {" · "}
            <span className="text-[#5F6368]">
              Lucky 버튼: &quot;{PRESETS[presetIndex].label}&quot;
            </span>
          </div>
        )}

        {/* Language links (only when NOT in chat mode) */}
        {!chatMode && !challenge && results.length === 0 && (
          <div className="text-[13px] text-[#70757a] mt-1">
            Google 제공 서비스:{" "}
            <a href="#" className="text-[#1a0dab] hover:underline ml-1">
              한국어
            </a>
          </div>
        )}

        {/* ─── Second factor challenge ─── */}
        {challenge && (
          <div className="w-full max-w-[584px] bg-white rounded-lg border border-[#dfe1e5] p-6 mt-8 shadow-sm">
            <p className="text-[13px] text-[#70757a] mb-1.5">보안 확인</p>
            <p className="text-[16px] text-[#202124] font-medium mb-4">
              {challenge.question}
            </p>
            <form onSubmit={handleVerify} className="flex gap-2.5">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="답변 입력..."
                className="flex-1 h-10 rounded border border-[#dfe1e5] px-3 text-[14px] text-[#222] focus:outline-none focus:border-[#4285f4] focus:shadow-[0_0_0_1px_#4285f4]"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="h-10 px-5 rounded bg-[#1a73e8] text-white text-[14px] font-medium hover:bg-[#1765cc] disabled:opacity-50 transition-colors"
              >
                확인
              </button>
            </form>
          </div>
        )}

        {/* ─── Normal search results (non-chat mode) ─── */}
        {!chatMode && results.length > 0 && (
          <div className="w-full max-w-[584px] mt-6 space-y-6">
            {results.map((r, i) => (
              <div key={i}>
                <div className="text-[12px] text-[#202124] mb-0.5">
                  {r.url}
                </div>
                <a
                  href={r.url}
                  className="text-[20px] text-[#1a0dab] hover:underline leading-[1.3]"
                >
                  {r.title}
                </a>
                <p className="text-[14px] text-[#4d5156] leading-[1.58] mt-1">
                  {r.snippet}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ─── Chat mode: messages interleaved chronologically ─── */}
        {chatMode && (
          <div className="w-full max-w-[584px] space-y-4">
            {sortedMessages.map((msg, i) => {
              const isSystem = msg.type === "SYSTEM";
              const isMine = msg.sender.id === myUserId;

              // SYSTEM message -> knowledge panel style
              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="border border-[#dfe1e5] rounded-lg p-4 bg-[#f8f9fa]"
                  >
                    <p className="text-[12px] text-[#70757a] mb-1">
                      검색 정보
                    </p>
                    <p className="text-[13px] text-[#4d5156] leading-[1.5]">
                      {msg.content}
                    </p>
                  </div>
                );
              }

              // My message -> "related search" chip style
              if (isMine) {
                return (
                  <div key={msg.id}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#dfe1e5] bg-white hover:bg-[#f8f9fa] text-[14px] text-[#1a0dab]">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="#9AA0A6"
                      >
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                      </svg>
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // Other (guardian) messages -> search result card style
              return (
                <div key={msg.id}>
                  <div className="text-[12px] text-[#202124] mb-0.5">
                    {fakeUrl(i)}
                  </div>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-[20px] text-[#1a0dab] hover:underline leading-[1.3] cursor-default"
                  >
                    {fakeTitle(msg)}
                  </a>
                  <p className="text-[14px] text-[#4d5156] leading-[1.58] mt-1">
                    {msg.content}
                  </p>
                </div>
              );
            })}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <footer className="w-full bg-[#f2f2f2] mt-auto">
        <div className="border-b border-[#dadce0] px-7 py-3.5">
          <span className="text-[15px] text-[#70757a]">대한민국</span>
        </div>
        <div className="px-7 py-3 flex flex-wrap items-center justify-between">
          {chatMode ? (
            <>
              {/* Preset buttons disguised as footer links */}
              <div className="flex flex-wrap gap-x-7 gap-y-1">
                {PRESETS.slice(0, 3).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      sendTextMessage(p.label);
                    }}
                    disabled={loading}
                    className="text-[14px] text-[#70757a] hover:underline disabled:opacity-50 cursor-pointer bg-transparent border-none"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-7 gap-y-1">
                {PRESETS.slice(3).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      sendTextMessage(p.label);
                    }}
                    disabled={loading}
                    className="text-[14px] text-[#70757a] hover:underline disabled:opacity-50 cursor-pointer bg-transparent border-none"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-7 gap-y-1">
                <a
                  href="#"
                  className="text-[14px] text-[#70757a] hover:underline"
                >
                  광고
                </a>
                <a
                  href="#"
                  className="text-[14px] text-[#70757a] hover:underline"
                >
                  비즈니스
                </a>
                <a
                  href="#"
                  className="text-[14px] text-[#70757a] hover:underline"
                >
                  검색의 원리
                </a>
              </div>
              <div className="flex flex-wrap gap-x-7 gap-y-1">
                <a
                  href="#"
                  className="text-[14px] text-[#70757a] hover:underline"
                >
                  개인정보처리방침
                </a>
                <a
                  href="#"
                  className="text-[14px] text-[#70757a] hover:underline"
                >
                  약관
                </a>
                <a
                  href="#"
                  className="text-[14px] text-[#70757a] hover:underline"
                >
                  설정
                </a>
              </div>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
