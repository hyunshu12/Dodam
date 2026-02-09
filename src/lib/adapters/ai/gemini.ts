/**
 * Google Gemini AI Adapter (Primary)
 * Uses @google/generative-ai SDK
 * Model: gemini-2.0-flash (free tier, fast)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { IAiAnalyzer } from "./interface";
import { AIAnalysisResult, UrgencyResult } from "@/types";
import {
  ANALYSIS_SYSTEM_PROMPT,
  URGENCY_SYSTEM_PROMPT,
  formatMessagesForPrompt,
} from "./prompt";

const TIMEOUT_MS = 15000;

export class GeminiAnalyzer implements IAiAnalyzer {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyze(
    messages: { role: string; text: string }[]
  ): Promise<AIAnalysisResult> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const conversationText = formatMessagesForPrompt(messages);
    const prompt = `${ANALYSIS_SYSTEM_PROMPT}\n\n--- 대화 내용 ---\n${conversationText}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const result = await model.generateContent(prompt);
      clearTimeout(timeout);

      const text = result.response.text();
      const parsed = JSON.parse(text) as AIAnalysisResult;

      if (!parsed.summaryText || !parsed.scamRiskLevel || !parsed.scamSignals || !parsed.actionGuide) {
        throw new Error("Gemini response missing required fields");
      }

      return parsed;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async assessUrgency(
    messages: { role: string; text: string }[]
  ): Promise<UrgencyResult> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 100,
      },
    });

    const conversationText = formatMessagesForPrompt(messages);
    const prompt = `${URGENCY_SYSTEM_PROMPT}\n\n--- 대화 ---\n${conversationText}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const result = await model.generateContent(prompt);
      clearTimeout(timeout);

      const text = result.response.text();
      const parsed = JSON.parse(text) as UrgencyResult;

      if (!parsed.level || !["EMERGENCY", "CAUTION", "SAFE"].includes(parsed.level)) {
        throw new Error("Invalid urgency level from Gemini");
      }

      return {
        level: parsed.level,
        reason: parsed.reason || "",
      };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
}
