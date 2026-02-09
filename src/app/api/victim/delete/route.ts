import { NextRequest, NextResponse } from "next/server";
import { requireRole, clearAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/adapters/storage";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * POST /api/victim/delete
 * Delete room data or entire account
 * - { roomId } -> delete specific room and all associated data
 * - {} -> delete entire account and all associated data
 */
export async function POST(request: NextRequest) {
  try {
    const result = await requireRole(request, "VICTIM");
    if (result instanceof NextResponse) return result;

    const body = await request.json();
    const { roomId } = body;
    const victimId = result.user.id;
    const storage = getStorageAdapter();

    // Create deletion request for audit
    await prisma.deletionRequest.create({
      data: {
        victimId,
        roomId: roomId || null,
        status: "REQUESTED",
      },
    });

    if (roomId) {
      // ── Delete specific room ──
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
      });

      if (!room || room.victimId !== victimId) {
        return errorResponse("Room not found or not owned by you", 404, "NOT_FOUND");
      }

      // Delete files from storage
      const messages = await prisma.message.findMany({
        where: { roomId, fileId: { not: null } },
        select: { fileId: true },
      });
      const fileIds = messages.map((m) => m.fileId).filter(Boolean) as string[];
      const files = await prisma.fileObject.findMany({
        where: { id: { in: fileIds } },
      });
      for (const file of files) {
        await storage.delete(file.storageKey);
      }

      // Delete in order: messages, files, insights, notifications, members, room
      await prisma.message.deleteMany({ where: { roomId } });
      if (fileIds.length > 0) {
        await prisma.fileObject.deleteMany({ where: { id: { in: fileIds } } });
      }
      await prisma.aIInsight.deleteMany({ where: { roomId } });
      await prisma.notification.deleteMany({ where: { roomId } });
      await prisma.progressCheck.deleteMany({ where: { roomId } });
      await prisma.roomMember.deleteMany({ where: { roomId } });
      await prisma.chatRoom.delete({ where: { id: roomId } });

      // Mark deletion done
      await prisma.deletionRequest.updateMany({
        where: { victimId, roomId, status: "REQUESTED" },
        data: { status: "DONE", doneAt: new Date() },
      });

      return successResponse({ message: "Room and all associated data deleted" });
    } else {
      // ── Delete entire account ──
      // Get all rooms
      const rooms = await prisma.chatRoom.findMany({
        where: { victimId },
        select: { id: true },
      });
      const roomIds = rooms.map((r) => r.id);

      // Delete files from storage
      const messages = await prisma.message.findMany({
        where: { roomId: { in: roomIds }, fileId: { not: null } },
        select: { fileId: true },
      });
      const fileIds = messages.map((m) => m.fileId).filter(Boolean) as string[];
      const files = await prisma.fileObject.findMany({
        where: { id: { in: fileIds } },
      });
      for (const file of files) {
        await storage.delete(file.storageKey);
      }

      // Cascade delete handles most via schema, but explicit for completeness
      await prisma.message.deleteMany({ where: { roomId: { in: roomIds } } });
      if (fileIds.length > 0) {
        await prisma.fileObject.deleteMany({ where: { id: { in: fileIds } } });
      }
      await prisma.aIInsight.deleteMany({ where: { roomId: { in: roomIds } } });
      await prisma.notification.deleteMany({ where: { userId: victimId } });
      await prisma.progressCheck.deleteMany({ where: { roomId: { in: roomIds } } });
      await prisma.roomMember.deleteMany({ where: { roomId: { in: roomIds } } });
      await prisma.chatRoom.deleteMany({ where: { victimId } });
      await prisma.invitation.deleteMany({ where: { victimId } });
      await prisma.guardianLink.deleteMany({ where: { victimId } });
      await prisma.codeConfig.deleteMany({ where: { victimId } });
      await prisma.fileObject.deleteMany({ where: { ownerId: victimId } });

      // Mark deletion done, then delete user
      await prisma.deletionRequest.updateMany({
        where: { victimId, status: "REQUESTED" },
        data: { status: "DONE", doneAt: new Date() },
      });

      await prisma.user.delete({ where: { id: victimId } });

      await clearAuthCookie();

      return successResponse({ message: "Account and all associated data deleted" });
    }
  } catch (error) {
    console.error("[victim/delete]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
