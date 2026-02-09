/**
 * AI Analysis Adapter interface
 */
import { AIAnalysisResult, UrgencyResult } from "@/types";

export interface IAiAnalyzer {
  /**
   * Analyze conversation messages and return risk assessment
   * @param messages - Array of { role, text } from the chat room
   */
  analyze(messages: { role: string; text: string }[]): Promise<AIAnalysisResult>;

  /**
   * Lightweight urgency assessment - EMERGENCY / CAUTION / SAFE
   * @param messages - Array of { role, text } from the chat room
   */
  assessUrgency(messages: { role: string; text: string }[]): Promise<UrgencyResult>;
}
