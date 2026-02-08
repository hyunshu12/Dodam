import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAiAnalyzer } from "@/lib/adapters/ai";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * POST /api/rooms/:roomId/insight/refresh
 * Trigger AI re-analysis of room messages
 */
export async function POST(
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

    // Get all messages in the room
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { role: true, displayName: true } },
      },
    });

    if (messages.length === 0) {
      return errorResponse("No messages to analyze", 400, "NO_MESSAGES");
    }

    // Prepare messages for analysis
    const formattedMessages = messages
      .filter((m) => m.contentEncrypted)
      .map((m) => ({
        role: m.sender.role || "UNKNOWN",
        text: decrypt(m.contentEncrypted!),
      }));

    if (formattedMessages.length === 0) {
      return errorResponse("No text messages to analyze", 400, "NO_MESSAGES");
    }

    // Run AI analysis
    const analyzer = getAiAnalyzer();
    const analysisResult = await analyzer.analyze(formattedMessages);

    // Upsert insight
    const existingInsight = await prisma.aIInsight.findFirst({
      where: { roomId },
      orderBy: { updatedAt: "desc" },
    });

    let insight;
    if (existingInsight) {
      insight = await prisma.aIInsight.update({
        where: { id: existingInsight.id },
        data: {
          summaryText: analysisResult.summaryText,
          scamRiskLevel: analysisResult.scamRiskLevel,
          scamSignals: JSON.stringify(analysisResult.scamSignals),
          actionGuide: JSON.stringify(analysisResult.actionGuide),
          updatedAt: new Date(),
        },
      });
    } else {
      insight = await prisma.aIInsight.create({
        data: {
          roomId,
          summaryText: analysisResult.summaryText,
          scamRiskLevel: analysisResult.scamRiskLevel,
          scamSignals: JSON.stringify(analysisResult.scamSignals),
          actionGuide: JSON.stringify(analysisResult.actionGuide),
        },
      });
    }

    return successResponse({
      id: insight.id,
      summaryText: insight.summaryText,
      scamRiskLevel: insight.scamRiskLevel,
      scamSignals: JSON.parse(insight.scamSignals as string),
      actionGuide: JSON.parse(insight.actionGuide as string),
      updatedAt: insight.updatedAt,
    });
  } catch (error) {
    console.error("[insight refresh]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
