import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * GET /api/victim/guardians
 * Returns guardian list for the victim (NO phone numbers exposed)
 */
export async function GET(request: NextRequest) {
  try {
    const result = await requireRole(request, "VICTIM");
    if (result instanceof NextResponse) return result;

    const links = await prisma.guardianLink.findMany({
      where: { victimId: result.user.id },
      include: {
        guardian: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to safe response (no phone number)
    const guardians = links.map((link) => ({
      id: link.id,
      guardianId: link.guardianId,
      guardianName: link.guardian?.displayName || null,
      relationship: link.relationship,
      alias: link.guardianAlias,
      status: link.status,
      createdAt: link.createdAt,
      acceptedAt: link.acceptedAt,
    }));

    return successResponse(guardians);
  } catch (error) {
    console.error("[victim/guardians]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
