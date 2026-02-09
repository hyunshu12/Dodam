/**
 * OpenAI GPT AI Adapter (disabled - package removed for bundle size optimization)
 * Re-install `openai` and restore this file if needed in the future.
 */
import { IAiAnalyzer } from "./interface";
import { AIAnalysisResult, UrgencyResult } from "@/types";

export class OpenAIAnalyzer implements IAiAnalyzer {
  constructor() {
    throw new Error(
      "OpenAI adapter is disabled. Install the 'openai' package to use it."
    );
  }

  async analyze(
    _messages: { role: string; text: string }[]
  ): Promise<AIAnalysisResult> {
    throw new Error("OpenAI adapter is disabled");
  }

  async assessUrgency(
    _messages: { role: string; text: string }[]
  ): Promise<UrgencyResult> {
    throw new Error("OpenAI adapter is disabled");
  }
}
