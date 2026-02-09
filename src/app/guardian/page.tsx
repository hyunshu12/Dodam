"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface RoomSummary {
  roomId: string;
  victimName: string | null;
  isDuress: boolean;
  createdAt: string;
  insight: {
    summaryText: string;
    scamRiskLevel: string;
    updatedAt: string;
  } | null;
}

interface InsightDetail {
  summaryText: string;
  scamRiskLevel: string;
  scamSignals: { keyword: string; context: string }[];
  actionGuide: { id: string; title: string; detail: string }[];
}

export default function GuardianPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [insight, setInsight] = useState<InsightDetail | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      const res = await fetch("/api/guardian/rooms");
      const data = await res.json();
      if (data.ok) {
        setRooms(data.data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function selectRoom(roomId: string) {
    setSelectedRoom(roomId);
    setInsight(null);

    // Fetch insight + progress in parallel (Rule 1.4: Promise.all)
    const [insightRes, progressRes] = await Promise.all([
      fetch(`/api/rooms/${roomId}/insight`).then((r) => r.json()).catch(() => null),
      fetch(`/api/rooms/${roomId}/progress`).then((r) => r.json()).catch(() => null),
    ]);

    if (insightRes?.ok && insightRes.data.hasInsight) {
      setInsight(insightRes.data);
    }
    if (progressRes?.ok) {
      const map: Record<string, string> = {};
      for (const p of progressRes.data) {
        map[p.itemId] = p.status;
      }
      setProgressMap(map);
    }
  }

  async function refreshInsight() {
    if (!selectedRoom) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/rooms/${selectedRoom}/insight/refresh`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        setInsight(data.data);
      }
    } catch {
      // ignore
    }
    setRefreshing(false);
  }

  async function toggleProgress(itemId: string) {
    if (!selectedRoom) return;
    const current = progressMap[itemId] || "PENDING";
    const next = current === "DONE" ? "PENDING" : "DONE";

    try {
      await fetch(`/api/rooms/${selectedRoom}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: next }),
      });
      // Functional setState to avoid stale closure (Rule 5.9)
      setProgressMap((prev) => ({ ...prev, [itemId]: next }));
    } catch {
      // ignore
    }
  }

  const riskColors: Record<string, string> = {
    HIGH: "text-red-600 bg-red-50 border-red-200",
    MEDIUM: "text-yellow-700 bg-yellow-50 border-yellow-200",
    LOW: "text-green-600 bg-green-50 border-green-200",
  };

  const riskColor = (level: string) =>
    riskColors[level] || riskColors["LOW"];

  if (loading) {
    return (
      <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
        <div className="flex items-center justify-center min-h-screen">
          <p className="font-body text-[#505050]">불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[var(--color-bg-light)]">
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-12 reveal">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Room list */}
          <div className="space-y-3">
            <h2 className="font-heading font-bold text-xl text-black mb-4">
              긴급 채팅방 목록
            </h2>
            {rooms.length === 0 && (
              <div className="bg-white rounded-[18px] p-8 text-center">
                <p className="font-body text-[#848484] text-sm">
                  아직 긴급 채팅방이 없습니다.
                </p>
              </div>
            )}
            {rooms.map((room) => (
              <button
                key={room.roomId}
                onClick={() => selectRoom(room.roomId)}
                className={`w-full text-left p-5 rounded-[18px] transition-all ${
                  selectedRoom === room.roomId
                    ? "bg-white border-2 border-[var(--color-primary)] shadow-md"
                    : "bg-white border border-transparent hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-black">
                    {room.victimName || "사용자"}
                    {room.isDuress && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-body">
                        듀레스
                      </span>
                    )}
                  </span>
                  {room.insight && (
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-body font-semibold border ${riskColor(
                        room.insight.scamRiskLevel
                      )}`}
                    >
                      {room.insight.scamRiskLevel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#848484] font-body mt-2">
                  {new Date(room.createdAt).toLocaleString("ko-KR")}
                </p>
              </button>
            ))}
          </div>

          {/* Insight panel */}
          <div className="md:col-span-2">
            {selectedRoom ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-bold text-xl text-black">
                    AI 분석 결과
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={refreshInsight}
                      disabled={refreshing}
                      className="px-5 py-2.5 rounded-[11px] bg-[var(--color-primary)] text-white font-heading font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {refreshing ? "분석 중..." : "AI 재분석"}
                    </button>
                    <button
                      onClick={() => router.push(`/room/${selectedRoom}`)}
                      className="px-5 py-2.5 rounded-[11px] border border-[var(--color-input-border)] text-[#505050] font-heading font-bold text-sm hover:bg-white transition-colors"
                    >
                      채팅방 이동
                    </button>
                  </div>
                </div>

                {insight ? (
                  <>
                    {/* Risk Level */}
                    <div
                      className={`p-6 rounded-[18px] border ${riskColor(
                        insight.scamRiskLevel
                      )}`}
                    >
                      <p className="font-heading font-bold text-xl">
                        위험도: {insight.scamRiskLevel}
                      </p>
                      <p className="font-body mt-2">{insight.summaryText}</p>
                    </div>

                    {/* Scam Signals */}
                    {insight.scamSignals.length > 0 && (
                      <div className="bg-white rounded-[18px] border border-gray-100 p-6">
                        <h3 className="font-heading font-bold text-lg mb-4">
                          탐지된 위험 신호
                        </h3>
                        <ul className="space-y-2">
                          {insight.scamSignals.map((s, i) => (
                            <li key={i} className="font-body text-sm">
                              <span className="font-semibold text-black">
                                {s.keyword}
                              </span>
                              <span className="text-[#505050]">
                                : {s.context}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Guide */}
                    <div className="bg-white rounded-[18px] border border-gray-100 p-6">
                      <h3 className="font-heading font-bold text-lg mb-4">
                        행동 가이드
                      </h3>
                      <ul className="space-y-3">
                        {insight.actionGuide.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-3"
                          >
                            <button
                              onClick={() => toggleProgress(item.id)}
                              className={`mt-0.5 w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                progressMap[item.id] === "DONE"
                                  ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                                  : "border-gray-300 hover:border-[var(--color-primary)]"
                              }`}
                            >
                              {progressMap[item.id] === "DONE" && (
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                            <div>
                              <p
                                className={`font-heading font-semibold ${
                                  progressMap[item.id] === "DONE"
                                    ? "line-through text-[#848484]"
                                    : "text-black"
                                }`}
                              >
                                {item.title}
                              </p>
                              <p className="font-body text-sm text-[#505050]">
                                {item.detail}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-[18px] p-12 text-center">
                    <p className="font-body text-[#848484]">
                      AI 분석 결과가 없습니다.
                      <br />
                      &quot;AI 재분석&quot; 버튼을 눌러 분석을 시작하세요.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[18px] p-12 text-center">
                <p className="font-body text-[#848484]">
                  왼쪽에서 채팅방을 선택하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
