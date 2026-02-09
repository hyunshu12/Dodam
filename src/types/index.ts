/**
 * Shared types for Emergency Connect
 */

export type UserRole = "VICTIM" | "GUARDIAN";
export type LinkStatus = "PENDING" | "ACTIVE" | "REJECTED";
export type InvitationStatus = "SENT" | "ACCEPTED" | "EXPIRED";
export type MessageType = "TEXT" | "FILE" | "SYSTEM";
export type NotificationChannel = "SMS";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type ScamRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type RoomRole = "VICTIM" | "GUARDIAN";
export type SecondFactorType = "QUESTION" | "OTP";

export interface ActionGuideItem {
  id: string;
  title: string;
  detail: string;
}

export interface ScamSignal {
  keyword: string;
  context: string;
}

export interface AIAnalysisResult {
  summaryText: string;
  scamRiskLevel: ScamRiskLevel;
  scamSignals: ScamSignal[];
  actionGuide: ActionGuideItem[];
}

export type UrgencyLevel = "EMERGENCY" | "CAUTION" | "SAFE";

export interface UrgencyResult {
  level: UrgencyLevel;
  reason: string;
}

/** Preset message templates for quick-send */
export const MESSAGE_PRESETS: Record<string, string> = {
  HELP: "도움이 필요합니다. 빨리 연락해 주세요.",
  SAFE: "지금은 안전합니다.",
  CALL_POLICE: "경찰에 신고해 주세요.",
  LOCATION: "제 위치를 확인해 주세요.",
  MONEY_REQUEST: "누군가 돈을 요구하고 있습니다.",
  SUSPICIOUS_LINK: "의심스러운 링크를 받았습니다.",
  CANT_TALK: "지금 통화할 수 없는 상황입니다.",
};
