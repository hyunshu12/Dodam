import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/adapters/storage";
import { errorResponse } from "@/lib/errors";

/**
 * GET /api/files/:fileId
 * Stream a file (with room membership check)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    const { fileId } = await params;

    const fileObj = await prisma.fileObject.findUnique({
      where: { id: fileId },
      include: {
        messages: {
          select: { roomId: true },
          take: 1,
        },
      },
    });

    if (!fileObj) {
      return errorResponse("File not found", 404, "NOT_FOUND");
    }

    // Check access: user must be owner or member of a room where this file was shared
    if (fileObj.ownerId !== result.user.id) {
      const roomId = fileObj.messages[0]?.roomId;
      if (roomId) {
        const member = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: result.user.id } },
        });
        if (!member) {
          return errorResponse("Access denied", 403, "FORBIDDEN");
        }
      } else {
        return errorResponse("Access denied", 403, "FORBIDDEN");
      }
    }

    // Get file from storage
    const storage = getStorageAdapter();
    const data = await storage.get(fileObj.storageKey);

    if (!data) {
      return errorResponse("File not found in storage", 404, "NOT_FOUND");
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": fileObj.mimeType,
        "Content-Length": String(data.length),
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileObj.originalName)}"`,
      },
    });
  } catch (error) {
    console.error("[files GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
