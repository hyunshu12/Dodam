import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { successResponse, errorResponse } from "@/lib/errors";
import { createAndSendNotification } from "@/lib/notifications";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const result = await requireRole(request, "VICTIM");
    if (result instanceof NextResponse) return result;

    const body = await request.json();
    const { phone, relationship, alias } = body;

    if (!phone || !relationship) {
      return errorResponse("Phone and relationship are required", 400);
    }

    const victimId = result.user.id;
    const encryptedPhone = encrypt(phone);
    const token = uuid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation + guardian link in parallel (Rule 1.4: Promise.all)
    const [invitation] = await Promise.all([
      prisma.invitation.create({
        data: {
          victimId,
          guardianPhone: encryptedPhone,
          token,
          expiresAt,
          status: "SENT",
        },
      }),
      prisma.guardianLink.create({
        data: {
          victimId,
          guardianPhone: encryptedPhone,
          relationship,
          guardianAlias: alias || null,
          status: "PENDING",
        },
      }),
    ]);

    // Send SMS notification (attempt immediate, non-blocking for response)
    await createAndSendNotification({
      userId: victimId, // tracked under victim for now
      channel: "SMS",
      encryptedPhone,
      payload: {
        type: "INVITATION",
        message: `[긴급연결] ${result.user.displayName || "사용자"}님이 보호자로 등록을 요청했습니다. 수락하려면 다음 링크를 방문하세요: /guardian/accept?token=${token}`,
        token,
      },
    });

    return successResponse(
      {
        invitationId: invitation.id,
        token, // For demo: in production this would only be in the SMS
        expiresAt: invitation.expiresAt,
      },
      201
    );
  } catch (error) {
    console.error("[invite]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
