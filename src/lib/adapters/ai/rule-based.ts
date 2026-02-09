/**
 * Rule-based AI Analyzer (Final Fallback)
 * Works without any API keys - keyword/pattern matching
 */
import { IAiAnalyzer } from "./interface";
import { AIAnalysisResult, ScamRiskLevel, UrgencyLevel, UrgencyResult } from "@/types";

// Korean scam keyword patterns
const SCAM_PATTERNS = {
  money: {
    keywords: ["송금", "입금", "계좌", "이체", "돈", "원", "만원", "결제", "현금", "비트코인", "코인"],
    label: "금전 요구",
  },
  personal_info: {
    keywords: ["비밀번호", "인증번호", "주민등록", "신분증", "계좌번호", "카드번호", "OTP", "본인확인"],
    label: "개인정보 요구",
  },
  impersonation: {
    keywords: ["경찰", "검찰", "금감원", "금융감독", "은행", "법원", "세무서", "국세청"],
    label: "기관 사칭",
  },
  urgency: {
    keywords: ["급해", "지금 당장", "바로", "즉시", "시간이 없", "빨리", "서둘러", "긴급"],
    label: "긴급성 조장",
  },
  threat: {
    keywords: ["체포", "구속", "벌금", "처벌", "고소", "신고", "블랙리스트", "동결"],
    label: "협박/위협",
  },
  link: {
    keywords: ["http://", "https://", "bit.ly", "링크", "클릭", "접속", "다운로드", "앱 설치"],
    label: "의심 링크/앱",
  },
  family: {
    keywords: ["엄마", "아빠", "아들", "딸", "아버지", "어머니", "할머니", "할아버지"],
    label: "가족 사칭 가능성",
  },
};

// Emergency keywords that indicate immediate danger
const EMERGENCY_KEYWORDS = [
  "도움", "살려", "위험", "무서", "협박", "납치", "폭력", "죽",
  "경찰", "신고", "체포", "구속", "감금", "도망", "다쳐",
];

const CAUTION_KEYWORDS = [
  "송금", "입금", "계좌", "돈", "결제", "비밀번호", "인증번호",
  "링크", "클릭", "의심", "이상", "불안", "걱정",
];

export class RuleBasedAnalyzer implements IAiAnalyzer {
  async assessUrgency(
    messages: { role: string; text: string }[]
  ): Promise<UrgencyResult> {
    const allText = messages.map((m) => m.text).join(" ");
    let emergencyScore = 0;
    let cautionScore = 0;
    const matchedEmergency: string[] = [];
    const matchedCaution: string[] = [];

    for (const keyword of EMERGENCY_KEYWORDS) {
      if (allText.includes(keyword)) {
        emergencyScore++;
        matchedEmergency.push(keyword);
      }
    }
    for (const keyword of CAUTION_KEYWORDS) {
      if (allText.includes(keyword)) {
        cautionScore++;
        matchedCaution.push(keyword);
      }
    }

    let level: UrgencyLevel;
    let reason: string;

    if (emergencyScore >= 2) {
      level = "EMERGENCY";
      reason = `긴급 키워드 감지: ${matchedEmergency.slice(0, 3).join(", ")}`;
    } else if (emergencyScore >= 1 || cautionScore >= 2) {
      level = "CAUTION";
      const keywords = [...matchedEmergency, ...matchedCaution].slice(0, 3);
      reason = `주의 키워드 감지: ${keywords.join(", ")}`;
    } else {
      level = "SAFE";
      reason = "뚜렷한 위험 징후가 발견되지 않았습니다.";
    }

    return { level, reason };
  }

  async analyze(
    messages: { role: string; text: string }[]
  ): Promise<AIAnalysisResult> {
    const allText = messages.map((m) => m.text).join(" ");
    const signals: { keyword: string; context: string }[] = [];
    let score = 0;

    // Check each pattern category
    for (const [, pattern] of Object.entries(SCAM_PATTERNS)) {
      const matchedKeywords: string[] = [];
      for (const keyword of pattern.keywords) {
        if (allText.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
      if (matchedKeywords.length > 0) {
        signals.push({
          keyword: pattern.label,
          context: `탐지된 키워드: ${matchedKeywords.join(", ")}`,
        });
        score += matchedKeywords.length;
      }
    }

    // Determine risk level
    let scamRiskLevel: ScamRiskLevel;
    if (score >= 5) {
      scamRiskLevel = "HIGH";
    } else if (score >= 2) {
      scamRiskLevel = "MEDIUM";
    } else {
      scamRiskLevel = "LOW";
    }

    // Generate summary
    const msgCount = messages.length;
    const summaryText =
      signals.length > 0
        ? `총 ${msgCount}개의 메시지를 분석했습니다. ${signals.map((s) => s.keyword).join(", ")} 패턴이 감지되었습니다. 위험도: ${scamRiskLevel}.`
        : `총 ${msgCount}개의 메시지를 분석했습니다. 현재까지 뚜렷한 피싱 징후는 발견되지 않았습니다.`;

    // Generate action guide based on risk level
    const actionGuide = this.getActionGuide(scamRiskLevel, signals);

    return {
      summaryText,
      scamRiskLevel,
      scamSignals: signals,
      actionGuide,
    };
  }

  private getActionGuide(
    level: ScamRiskLevel,
    signals: { keyword: string; context: string }[]
  ) {
    const baseGuide = [
      {
        id: "contact-victim",
        title: "피해자에게 직접 연락",
        detail: "전화 또는 직접 만나서 상황을 확인하세요. 문자/채팅만으로 판단하지 마세요.",
      },
    ];

    if (level === "LOW") {
      return [
        ...baseGuide,
        {
          id: "monitor",
          title: "상황 모니터링",
          detail: "현재 위험도가 낮지만 대화 내용을 계속 주시하세요.",
        },
      ];
    }

    const guide = [...baseGuide];

    if (level === "MEDIUM" || level === "HIGH") {
      guide.push({
        id: "no-transfer",
        title: "금전 이체 중지",
        detail: "어떤 명목이든 돈을 보내지 않도록 피해자에게 알리세요.",
      });
      guide.push({
        id: "verify-identity",
        title: "상대방 신원 확인",
        detail: "전화를 건 사람이나 메시지를 보낸 사람의 실제 신원을 확인하세요.",
      });
    }

    if (level === "HIGH") {
      guide.push({
        id: "call-police",
        title: "경찰 신고 (112)",
        detail: "피싱 사기가 의심되면 즉시 112에 신고하세요.",
      });
      guide.push({
        id: "call-financial",
        title: "금융감독원 신고 (1332)",
        detail: "금융 피해가 의심되면 금융감독원에 신고하세요.",
      });
      guide.push({
        id: "block-account",
        title: "계좌 지급정지 요청",
        detail: "이미 송금한 경우, 해당 은행에 즉시 지급정지를 요청하세요.",
      });
    }

    // Add specific signals-based advice
    const hasLinkSignal = signals.some((s) => s.keyword.includes("링크"));
    if (hasLinkSignal) {
      guide.push({
        id: "no-click",
        title: "링크 클릭 금지",
        detail: "의심스러운 링크는 절대 클릭하지 마세요. 악성 앱 설치 위험이 있습니다.",
      });
    }

    return guide;
  }
}
