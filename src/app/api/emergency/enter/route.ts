import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareHash } from "@/lib/crypto";
import { signToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/errors";
import { checkRateLimit, recordAttempt } from "@/lib/rate-limit";

// Dummy search results for camouflage
const DUMMY_SEARCH_RESULTS = [
  { title: "오늘의 날씨 - 전국 날씨 예보", url: "https://weather.example.com", snippet: "전국 날씨 정보를 확인하세요..." },
  { title: "네이버 뉴스 - 최신 뉴스 모아보기", url: "https://news.example.com", snippet: "실시간 뉴스를 확인하세요..." },
  { title: "맛집 추천 - 인기 맛집 리스트", url: "https://food.example.com", snippet: "주변 인기 맛집을 찾아보세요..." },
  { title: "영화 순위 - 이번 주 박스오피스", url: "https://movie.example.com", snippet: "이번 주 인기 영화 순위..." },
  { title: "쇼핑 - 오늘의 특가 상품", url: "https://shop.example.com", snippet: "오늘의 할인 상품을 확인하세요..." },
];

/**
 * POST /api/emergency/enter
 * The search bar entry point - checks if input matches any victim's code phrase
 * On mismatch: returns fake search results (camouflage)
 * On match: returns second factor challenge
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inputPhrase } = body;

    if (!inputPhrase || typeof inputPhrase !== "string") {
      // Return search results even for empty input (camouflage)
      return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
    }

    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `emergency:${ip}`;

    const rl = checkRateLimit(rateLimitKey);
    if (!rl.allowed) {
      // Still return search results to not reveal the system
      return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
    }

    // Record this attempt
    recordAttempt(rateLimitKey);

    // Get all code configs and try to match
    const configs = await prisma.codeConfig.findMany({
      include: {
        victim: { select: { id: true } },
      },
    });

    for (const config of configs) {
      // Check primary phrase
      const isPrimary = await compareHash(inputPhrase, config.primaryPhraseHash);
      if (isPrimary) {
        // Issue temp token for second factor
        const tempToken = signToken(
          {
            userId: config.victimId,
            role: "VICTIM",
            purpose: "SECOND_FACTOR",
            victimId: config.victimId,
            isDuress: false,
          },
          "5m" // 5 minute expiry
        );

        return successResponse({
          mode: "SECOND_FACTOR",
          challenge: {
            type: config.secondFactorType,
            question: config.secondFactorQuestion,
          },
          tempToken,
        });
      }

      // Check duress phrase
      if (config.duressPhraseHash) {
        const isDuress = await compareHash(inputPhrase, config.duressPhraseHash);
        if (isDuress) {
          const tempToken = signToken(
            {
              userId: config.victimId,
              role: "VICTIM",
              purpose: "SECOND_FACTOR",
              victimId: config.victimId,
              isDuress: true,
            },
            "5m"
          );

          return successResponse({
            mode: "SECOND_FACTOR",
            challenge: {
              type: config.secondFactorType,
              question: config.secondFactorQuestion,
            },
            tempToken,
          });
        }
      }
    }

    // No match found - return search results (camouflage)
    return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
  } catch (error) {
    console.error("[emergency/enter]", error);
    // Even on error, return search results to not reveal the system
    return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
  }
}
