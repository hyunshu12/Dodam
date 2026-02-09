import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * POST /api/guardian/invitations/accept
 * Guardian accepts an invitation using a token
 */
export async function POST(request: NextRequest) {
  try {
    const result = await requireRole(request, "GUARDIAN");
    if (result instanceof NextResponse) return result;

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return errorResponse("Token is required", 400);
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return errorResponse("Invalid invitation token", 404, "NOT_FOUND");
    }

    if (invitation.status === "ACCEPTED") {
      return errorResponse("Invitation already accepted", 400, "ALREADY_ACCEPTED");
    }

    if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
      // Update status if needed
      if (invitation.status !== "EXPIRED") {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
      }
      return errorResponse("Invitation has expired", 400, "EXPIRED");
    }

    const guardianId = result.user.id;

    // Update invitation + find matching link in parallel (Rule 1.4: Promise.all)
    const [, link] = await Promise.all([
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      }),
      prisma.guardianLink.findFirst({
        where: {
          victimId: invitation.victimId,
          guardianPhone: invitation.guardianPhone,
          status: "PENDING",
        },
      }),
    ]);

    if (link) {
      await prisma.guardianLink.update({
        where: { id: link.id },
        data: {
          guardianId,
          status: "ACTIVE",
          acceptedAt: new Date(),
        },
      });
    }

    return successResponse({
      message: "Invitation accepted",
      victimId: invitation.victimId,
    });
  } catch (error) {
    console.error("[accept invitation]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
