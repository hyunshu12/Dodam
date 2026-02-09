import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * GET /api/rooms/:roomId
 * Get room metadata (member check enforced)
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
      where: {
        roomId_userId: { roomId, userId: result.user.id },
      },
    });

    if (!member) {
      return errorResponse("Not a member of this room", 403, "FORBIDDEN");
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, role: true },
            },
          },
        },
      },
    });

    if (!room) {
      return errorResponse("Room not found", 404, "NOT_FOUND");
    }

    return successResponse({
      id: room.id,
      victimId: room.victimId,
      isDuress: room.isDuress,
      createdAt: room.createdAt,
      members: room.members.map((m) => ({
        userId: m.userId,
        displayName: m.user.displayName,
        roleInRoom: m.roleInRoom,
      })),
    });
  } catch (error) {
    console.error("[room GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
