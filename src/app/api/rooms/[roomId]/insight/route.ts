import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * GET /api/rooms/:roomId/insight
 * Get the latest AI insight for a room
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

    const insight = await prisma.aIInsight.findFirst({
      where: { roomId },
      orderBy: { updatedAt: "desc" },
    });

    if (!insight) {
      return successResponse({ hasInsight: false });
    }

    return successResponse({
      hasInsight: true,
      id: insight.id,
      summaryText: insight.summaryText,
      scamRiskLevel: insight.scamRiskLevel,
      scamSignals: JSON.parse(insight.scamSignals as string),
      actionGuide: JSON.parse(insight.actionGuide as string),
      updatedAt: insight.updatedAt,
    });
  } catch (error) {
    console.error("[insight GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
