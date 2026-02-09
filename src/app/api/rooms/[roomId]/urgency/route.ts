import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAiAnalyzer } from "@/lib/adapters/ai";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * GET /api/rooms/:roomId/urgency
 * Lightweight urgency assessment: EMERGENCY / CAUTION / SAFE
 * Uses Gemini free tier with rate limiting, falls back to rule-based
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    const { roomId } = await params;

    // Check membership
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: result.user.id } },
    });
    if (!member) {
      return errorResponse("Not a member of this room", 403, "FORBIDDEN");
    }

    // Get recent messages (last 30 for urgency check - lightweight)
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        sender: { select: { role: true, displayName: true } },
      },
    });

    if (messages.length === 0) {
      return successResponse({
        level: "SAFE",
        reason: "대화 내용이 없습니다.",
      });
    }

    // Prepare messages for analysis (reverse to chronological order)
    const formattedMessages = messages
      .reverse()
      .filter((m) => m.contentEncrypted)
      .map((m) => ({
        role: m.sender.role || "UNKNOWN",
        text: decrypt(m.contentEncrypted!),
      }));

    if (formattedMessages.length === 0) {
      return successResponse({
        level: "SAFE",
        reason: "분석할 텍스트 메시지가 없습니다.",
      });
    }

    // Run urgency assessment
    const analyzer = getAiAnalyzer();
    const urgencyResult = await analyzer.assessUrgency(formattedMessages);

    return successResponse(urgencyResult);
  } catch (error) {
    console.error("[urgency GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
