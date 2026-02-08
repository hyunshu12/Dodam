"use client";

import { useState, useEffect, useRef, use } from "react";

interface Message {
  id: string;
  sender: { id: string; displayName: string | null; role: string };
  type: string;
  content: string | null;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null;
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

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roomId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`);
      const data = await res.json();
      if (data.ok) {
        setMessages(data.data.messages);
      }
    } catch {
      // ignore
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TEXT", text }),
      });
      setText("");
      await loadMessages();
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function sendPreset(presetKey: string) {
    setLoading(true);
    try {
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetKey }),
      });
      await loadMessages();
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (uploadData.ok) {
        await fetch(`/api/rooms/${roomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "FILE", fileId: uploadData.data.id }),
        });
        await loadMessages();
      }
    } catch {
      // ignore
    }
    setLoading(false);
    e.target.value = "";
  }

  return (
    <div className="w-full h-screen bg-[var(--color-bg-dark)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="font-heading font-bold text-white text-lg">
          긴급 채팅
        </h2>
        <a
          href="/guardian"
          className="font-body font-semibold text-sm text-[var(--color-primary)] hover:text-[var(--color-brand)] transition-colors"
        >
          대시보드
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.type === "SYSTEM"
                ? "text-center"
                : "flex flex-col"
            }
          >
            {msg.type === "SYSTEM" ? (
              <p className="text-[var(--color-text-placeholder)] text-sm font-body">
                {msg.content}
              </p>
            ) : (
              <>
                <span className="text-xs text-white/40 font-body mb-1">
                  {msg.sender.displayName || msg.sender.role} ·{" "}
                  {new Date(msg.createdAt).toLocaleTimeString("ko-KR")}
                </span>
                {msg.type === "TEXT" && (
                  <p className="bg-white/10 rounded-lg px-4 py-3 inline-block max-w-md text-white font-body text-sm">
                    {msg.content}
                  </p>
                )}
                {msg.type === "FILE" && msg.file && (
                  <a
                    href={`/api/files/${msg.file.id}`}
                    target="_blank"
                    className="bg-[var(--color-primary)]/20 rounded-lg px-4 py-3 inline-block text-[var(--color-brand)] hover:underline font-body text-sm"
                  >
                    {msg.file.originalName} (
                    {(msg.file.size / 1024).toFixed(1)}KB)
                  </a>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Presets */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto border-t border-white/10">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => sendPreset(p.key)}
            disabled={loading}
            className="whitespace-nowrap bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm text-white/80 font-body font-semibold hover:bg-white/20 disabled:opacity-50 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <form
        onSubmit={sendMessage}
        className="px-6 py-4 flex gap-3 border-t border-white/10"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
          className="flex-1 bg-transparent text-white font-body font-semibold text-lg placeholder:text-[var(--color-text-placeholder)] focus:outline-none"
          disabled={loading}
        />

        <label className="flex items-center justify-center w-10 h-10 cursor-pointer text-white/60 hover:text-white transition-colors">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
          <input
            type="file"
            className="hidden"
            onChange={uploadFile}
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="h-[47px] px-6 rounded-[4px] bg-[var(--color-primary)] text-white font-body font-semibold text-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          전송
        </button>
      </form>
    </div>
  );
}
