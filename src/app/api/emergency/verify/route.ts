import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareHash } from "@/lib/crypto";
import { verifyToken, signToken, setEmergencyCookie } from "@/lib/auth";
import { successResponse } from "@/lib/errors";
import { createAndSendNotification } from "@/lib/notifications";
import { encrypt } from "@/lib/crypto";

// Dummy search results for camouflage on failure
const DUMMY_SEARCH_RESULTS = [
  { title: "오늘의 날씨 - 전국 날씨 예보", url: "https://weather.example.com", snippet: "전국 날씨 정보를 확인하세요..." },
  { title: "네이버 뉴스 - 최신 뉴스 모아보기", url: "https://news.example.com", snippet: "실시간 뉴스를 확인하세요..." },
  { title: "맛집 추천 - 인기 맛집 리스트", url: "https://food.example.com", snippet: "주변 인기 맛집을 찾아보세요..." },
];

/**
 * POST /api/emergency/verify
 * Verify second factor answer -> create chat room + notify guardians
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempToken, answer } = body;

    if (!tempToken || !answer) {
      return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
    }

    // Verify temp token
    const payload = verifyToken(tempToken);
    if (!payload || payload.purpose !== "SECOND_FACTOR" || !payload.victimId) {
      return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
    }

    // Get code config
    const config = await prisma.codeConfig.findUnique({
      where: { victimId: payload.victimId },
    });

    if (!config) {
      return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
    }

    // Verify answer
    const isValid = await compareHash(answer, config.secondFactorAnswerHash);
    if (!isValid) {
      return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
    }

    // ── Success: Create chat room ──
    const isDuress = payload.isDuress || false;

    const room = await prisma.chatRoom.create({
      data: {
        victimId: payload.victimId,
        isDuress,
      },
    });

    // Add victim as member
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: payload.victimId,
        roleInRoom: "VICTIM",
      },
    });

    // Add all active guardians as members
    const guardianLinks = await prisma.guardianLink.findMany({
      where: {
        victimId: payload.victimId,
        status: "ACTIVE",
        guardianId: { not: null },
      },
    });

    for (const link of guardianLinks) {
      if (link.guardianId) {
        await prisma.roomMember.create({
          data: {
            roomId: room.id,
            userId: link.guardianId,
            roleInRoom: "GUARDIAN",
          },
        });

        // Send notification to each guardian
        await createAndSendNotification({
          userId: link.guardianId,
          roomId: room.id,
          channel: "SMS",
          encryptedPhone: link.guardianPhone,
          payload: {
            type: "EMERGENCY",
            message: isDuress
              ? `[긴급연결] 보호 대상자에게 긴급 상황이 발생했습니다. (듀레스 코드 사용됨) 즉시 확인하세요.`
              : `[긴급연결] 보호 대상자에게 긴급 상황이 발생했습니다. 즉시 확인하세요.`,
            roomId: room.id,
          },
        });
      }
    }

    // Add system message
    const systemMsg = isDuress
      ? "⚠️ 긴급 채팅방이 생성되었습니다. (듀레스 코드로 진입)"
      : "🚨 긴급 채팅방이 생성되었습니다.";

    await prisma.message.create({
      data: {
        roomId: room.id,
        senderId: payload.victimId,
        type: "SYSTEM",
        contentEncrypted: encrypt(systemMsg),
      },
    });

    // Set emergency cookie (does NOT overwrite main auth cookie)
    // #region agent log
    console.log('[DEBUG][FIX] emergency/verify setting EMERGENCY cookie (not overwriting main):', JSON.stringify({victimId:payload.victimId,isDuress}));
    fetch('http://127.0.0.1:7242/ingest/e9b5dedd-462b-4e37-895a-5212b39b1c11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'emergency/verify/route.ts:setEmergencyCookie',message:'Setting emergency cookie (not overwriting main)',data:{victimId:payload.victimId,isDuress},timestamp:Date.now(),hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    const authToken = signToken({
      userId: payload.victimId,
      role: "VICTIM",
    });
    await setEmergencyCookie(authToken);

    return successResponse({
      mode: "CHAT",
      roomId: room.id,
      isDuress,
      userId: payload.victimId,
    });
  } catch (error) {
    console.error("[emergency/verify]", error);
    return successResponse({ mode: "SEARCH", results: DUMMY_SEARCH_RESULTS });
  }
}
