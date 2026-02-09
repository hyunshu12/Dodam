import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * POST /api/rooms/:roomId/progress
 * Update action guide checklist item status
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

    const body = await request.json();
    const { itemId, status } = body;

    if (!itemId || !status || !["PENDING", "DONE"].includes(status)) {
      return errorResponse("itemId and status (PENDING/DONE) are required", 400);
    }

    // Upsert progress check
    const progress = await prisma.progressCheck.upsert({
      where: {
        roomId_itemId_userId: {
          roomId,
          itemId,
          userId: result.user.id,
        },
      },
      update: {
        status,
        updatedAt: new Date(),
      },
      create: {
        roomId,
        itemId,
        userId: result.user.id,
        status,
      },
    });

    return successResponse(progress);
  } catch (error) {
    console.error("[progress POST]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}

/**
 * GET /api/rooms/:roomId/progress
 * Get all progress checks for a room
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    const { roomId } = await params;

    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: result.user.id } },
    });
    if (!member) {
      return errorResponse("Not a member of this room", 403, "FORBIDDEN");
    }

    const checks = await prisma.progressCheck.findMany({
      where: { roomId },
    });

    return successResponse(checks);
  } catch (error) {
    console.error("[progress GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
