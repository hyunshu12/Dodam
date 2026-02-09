import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { successResponse, errorResponse } from "@/lib/errors";
import { MESSAGE_PRESETS } from "@/types";

/**
 * GET /api/rooms/:roomId/messages?cursor=&limit=
 * Get messages with cursor-based pagination
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

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, displayName: true, role: true } },
        file: { select: { id: true, originalName: true, mimeType: true, size: true } },
      },
    });

    // Decrypt message content
    const decryptedMessages = messages.map((msg) => ({
      id: msg.id,
      roomId: msg.roomId,
      sender: msg.sender,
      type: msg.type,
      content: msg.contentEncrypted ? decrypt(msg.contentEncrypted) : null,
      file: msg.file,
      createdAt: msg.createdAt,
    }));

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

    return successResponse({
      messages: decryptedMessages,
      nextCursor,
    });
  } catch (error) {
    console.error("[messages GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}

/**
 * POST /api/rooms/:roomId/messages
 * Send a message (TEXT, FILE, SYSTEM, or preset)
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
    let { type, text, fileId, presetKey } = body;

    // Handle preset
    if (presetKey && MESSAGE_PRESETS[presetKey]) {
      text = MESSAGE_PRESETS[presetKey];
      type = "TEXT";
    }

    // Validation
    if (!type || !["TEXT", "FILE", "SYSTEM"].includes(type)) {
      return errorResponse("Invalid message type", 400);
    }
    if (type === "TEXT" && !text) {
      return errorResponse("Text is required for TEXT messages", 400);
    }
    if (type === "FILE" && !fileId) {
      return errorResponse("FileId is required for FILE messages", 400);
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: result.user.id,
        type,
        contentEncrypted: text ? encrypt(text) : null,
        fileId: fileId || null,
      },
      include: {
        sender: { select: { id: true, displayName: true, role: true } },
        file: { select: { id: true, originalName: true, mimeType: true, size: true } },
      },
    });

    return successResponse(
      {
        id: message.id,
        roomId: message.roomId,
        sender: message.sender,
        type: message.type,
        content: text || null,
        file: message.file,
        createdAt: message.createdAt,
      },
      201
    );
  } catch (error) {
    console.error("[messages POST]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
