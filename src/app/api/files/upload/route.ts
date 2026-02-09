import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/lib/adapters/storage";
import { successResponse, errorResponse } from "@/lib/errors";
import { v4 as uuid } from "uuid";

/**
 * POST /api/files/upload
 * Upload a file (multipart/form-data)
 */
export async function POST(request: NextRequest) {
  try {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // Size limit: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return errorResponse("File too large (max 10MB)", 400, "FILE_TOO_LARGE");
    }

    // Generate storage key with extension
    const ext = file.name.split(".").pop() || "bin";
    const storageKey = `${uuid()}.${ext}`;

    // Save to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorageAdapter();
    await storage.save(storageKey, buffer, file.type);

    // Create DB record
    const fileObj = await prisma.fileObject.create({
      data: {
        ownerId: result.user.id,
        storageKey,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
    });

    return successResponse(
      {
        id: fileObj.id,
        originalName: fileObj.originalName,
        mimeType: fileObj.mimeType,
        size: fileObj.size,
      },
      201
    );
  } catch (error) {
    console.error("[files/upload]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
