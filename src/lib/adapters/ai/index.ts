/**
 * AI Analyzer factory with fallback chain:
 * 1. Gemini (primary) - GEMINI_API_KEY required, FREE tier
 * 2. Rule-based (final fallback) - always available, no API key needed
 *
 * OpenAI is intentionally excluded to guarantee zero billing.
 * Rate limiting ensures usage stays within Gemini free tier limits.
 */
import { IAiAnalyzer } from "./interface";
import { AIAnalysisResult, UrgencyResult } from "@/types";
import { RuleBasedAnalyzer } from "./rule-based";
import { isAiCallAllowed, recordAiCall } from "./ai-rate-limit";

/**
 * Rate-limited fallback chain analyzer
 */
class FallbackAnalyzer implements IAiAnalyzer {
  private geminiCreator: (() => IAiAnalyzer) | null = null;
  private ruleBased = new RuleBasedAnalyzer();

  constructor() {
    // Only Gemini (free tier) - OpenAI excluded to avoid charges
    if (process.env.GEMINI_API_KEY) {
      this.geminiCreator = () => {
        const { GeminiAnalyzer } = require("./gemini");
        return new GeminiAnalyzer();
      };
    }
  }

  async analyze(
    messages: { role: string; text: string }[]
  ): Promise<AIAnalysisResult> {
    // Try Gemini if within rate limits
    if (this.geminiCreator && isAiCallAllowed()) {
      try {
        console.log("[AI] Trying Gemini (free tier)...");
        recordAiCall();
        const instance = this.geminiCreator();
        const result = await instance.analyze(messages);
        console.log("[AI] Gemini succeeded");
        return result;
      } catch (error) {
        console.warn(
          "[AI] Gemini failed:",
          error instanceof Error ? error.message : error
        );
      }
    } else if (!isAiCallAllowed()) {
      console.warn("[AI] Rate limit reached, using rule-based fallback");
    }

    // Fallback: rule-based (no API cost)
    console.log("[AI] Using rule-based analyzer");
    return this.ruleBased.analyze(messages);
  }

  async assessUrgency(
    messages: { role: string; text: string }[]
  ): Promise<UrgencyResult> {
    // Try Gemini if within rate limits
    if (this.geminiCreator && isAiCallAllowed()) {
      try {
        console.log("[AI] Urgency check via Gemini (free tier)...");
        recordAiCall();
        const instance = this.geminiCreator();
        const result = await instance.assessUrgency(messages);
        console.log("[AI] Gemini urgency succeeded:", result.level);
        return result;
      } catch (error) {
        console.warn(
          "[AI] Gemini urgency failed:",
          error instanceof Error ? error.message : error
        );
      }
    } else if (!isAiCallAllowed()) {
      console.warn("[AI] Rate limit reached for urgency, using rule-based");
    }

    // Fallback: rule-based
    console.log("[AI] Using rule-based urgency");
    return this.ruleBased.assessUrgency(messages);
  }
}

let analyzerInstance: FallbackAnalyzer | null = null;

export function getAiAnalyzer(): IAiAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new FallbackAnalyzer();
  }
  return analyzerInstance;
}

export type { IAiAnalyzer } from "./interface";
