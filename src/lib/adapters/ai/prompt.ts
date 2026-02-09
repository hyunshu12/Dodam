/**
 * Shared system prompt and JSON schema for LLM-based analysis
 * Used by Gemini adapter (primary) and rule-based fallback
 */

export const ANALYSIS_SYSTEM_PROMPT = `당신은 피싱/보이스피싱/스미싱 탐지 및 위기 상황 분석 전문 AI입니다.
아래 대화 내용을 분석하여 JSON 형식으로 결과를 반환하세요.

분석 기준:
1. 대화 내용을 2~4문장으로 요약합니다.
2. 피싱/사기 위험도를 LOW, MEDIUM, HIGH 중 하나로 판단합니다.
3. 위험 신호(scamSignals)를 구체적으로 식별합니다. 아래 패턴을 주의하세요:
   - 금전 요구 (송금, 입금, 계좌이체 등)
   - 개인정보 요구 (비밀번호, 인증번호, 주민등록번호 등)
   - 의심스러운 링크 공유
   - 급박함/긴급성 조장 ("지금 당장", "시간이 없어" 등)
   - 기관 사칭 (경찰, 검찰, 은행, 금감원 등)
   - 가족/지인 사칭
   - 협박 또는 위협
4. 보호자를 위한 행동 가이드(actionGuide)를 체크리스트 형태로 제공합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
{
  "summaryText": "대화 요약 (2~4문장)",
  "scamRiskLevel": "LOW|MEDIUM|HIGH",
  "scamSignals": [
    { "keyword": "탐지된 키워드/패턴", "context": "해당 맥락 설명" }
  ],
  "actionGuide": [
    { "id": "고유ID", "title": "조치 제목", "detail": "상세 설명" }
  ]
}`;

/**
 * Lightweight urgency assessment prompt
 * Uses minimal tokens for quick EMERGENCY / CAUTION / SAFE classification
 */
export const URGENCY_SYSTEM_PROMPT = `당신은 긴급 상황 분류 AI입니다. 대화 내용을 읽고 상황의 긴급도를 판단하세요.

긴급도 기준:
- EMERGENCY: 즉각적인 위험. 금전 피해 진행 중, 협박, 납치, 폭력 위협, 신체 위험
- CAUTION: 잠재적 위험. 의심스러운 연락, 개인정보 요구, 불안한 상황이지만 즉각 위험은 아님
- SAFE: 안전한 상태. 일상 대화, 안전 확인 완료, 위험 징후 없음

반드시 아래 JSON으로만 응답하세요:
{"level":"EMERGENCY|CAUTION|SAFE","reason":"판단 근거 한줄"}`;

export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    summaryText: { type: "string" },
    scamRiskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    scamSignals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          context: { type: "string" },
        },
        required: ["keyword", "context"],
      },
    },
    actionGuide: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["id", "title", "detail"],
      },
    },
  },
  required: ["summaryText", "scamRiskLevel", "scamSignals", "actionGuide"],
};

/**
 * Format messages into a conversation string for the LLM
 */
export function formatMessagesForPrompt(
  messages: { role: string; text: string }[]
): string {
  return messages
    .map((m) => `[${m.role}] ${m.text}`)
    .join("\n");
}
