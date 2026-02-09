import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * GET /api/guardian/rooms
 * List rooms the guardian is a member of, with latest AI insight
 */
export async function GET(request: NextRequest) {
  try {
    const result = await requireRole(request, "GUARDIAN");
    if (result instanceof NextResponse) return result;

    const memberships = await prisma.roomMember.findMany({
      where: { userId: result.user.id, roleInRoom: "GUARDIAN" },
      include: {
        room: {
          include: {
            victim: { select: { id: true, displayName: true } },
            insights: {
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { room: { createdAt: "desc" } },
    });

    const rooms = memberships.map((m) => {
      const insight = m.room.insights[0];
      return {
        roomId: m.room.id,
        victimName: m.room.victim.displayName,
        isDuress: m.room.isDuress,
        createdAt: m.room.createdAt,
        insight: insight
          ? {
              summaryText: insight.summaryText,
              scamRiskLevel: insight.scamRiskLevel,
              updatedAt: insight.updatedAt,
            }
          : null,
      };
    });

    return successResponse(rooms);
  } catch (error) {
    console.error("[guardian/rooms]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
