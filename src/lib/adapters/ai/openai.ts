/**
 * OpenAI GPT AI Adapter (Secondary Fallback)
 * Uses openai SDK
 * Model: gpt-4o-mini (cost-effective)
 */
import OpenAI from "openai";
import { IAiAnalyzer } from "./interface";
import { AIAnalysisResult } from "@/types";
import { ANALYSIS_SYSTEM_PROMPT, formatMessagesForPrompt } from "./prompt";

const TIMEOUT_MS = 15000;

export class OpenAIAnalyzer implements IAiAnalyzer {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });
  }

  async analyze(
    messages: { role: string; text: string }[]
  ): Promise<AIAnalysisResult> {
    const conversationText = formatMessagesForPrompt(messages);

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `아래 대화 내용을 분석해 주세요:\n\n${conversationText}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI returned empty response");
    }

    const parsed = JSON.parse(text) as AIAnalysisResult;

    // Validate required fields
    if (!parsed.summaryText || !parsed.scamRiskLevel || !parsed.scamSignals || !parsed.actionGuide) {
      throw new Error("OpenAI response missing required fields");
    }

    return parsed;
  }
}
