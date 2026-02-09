import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashValue } from "@/lib/crypto";
import { successResponse, errorResponse } from "@/lib/errors";

/**
 * POST /api/victim/code-config
 * Create or update code configuration (phrases stored as hashes only)
 */
export async function POST(request: NextRequest) {
  try {
    const result = await requireRole(request, "VICTIM");
    if (result instanceof NextResponse) return result;

    const body = await request.json();
    const {
      primaryPhrase,
      duressPhrase,
      secondFactorQuestion,
      secondFactorAnswer,
      attemptsPerWindow,
      windowSeconds,
      lockSeconds,
      rotateReminderDays,
    } = body;

    // Validation
    if (!primaryPhrase || primaryPhrase.length < 3) {
      return errorResponse("Primary phrase must be at least 3 characters", 400);
    }
    if (!secondFactorQuestion || !secondFactorAnswer) {
      return errorResponse("Second factor question and answer are required", 400);
    }
    if (duressPhrase && duressPhrase === primaryPhrase) {
      return errorResponse("Duress phrase must be different from primary phrase", 400);
    }

    const victimId = result.user.id;

    // Hash all sensitive values
    const primaryPhraseHash = await hashValue(primaryPhrase);
    const duressPhraseHash = duressPhrase ? await hashValue(duressPhrase) : null;
    const secondFactorAnswerHash = await hashValue(secondFactorAnswer);

    // Upsert code config
    const config = await prisma.codeConfig.upsert({
      where: { victimId },
      update: {
        primaryPhraseHash,
        duressPhraseHash,
        secondFactorQuestion,
        secondFactorAnswerHash,
        attemptsPerWindow: attemptsPerWindow || 5,
        windowSeconds: windowSeconds || 300,
        lockSeconds: lockSeconds || 600,
        rotateReminderDays: rotateReminderDays || null,
      },
      create: {
        victimId,
        primaryPhraseHash,
        duressPhraseHash,
        secondFactorQuestion,
        secondFactorAnswerHash,
        attemptsPerWindow: attemptsPerWindow || 5,
        windowSeconds: windowSeconds || 300,
        lockSeconds: lockSeconds || 600,
        rotateReminderDays: rotateReminderDays || null,
      },
    });

    return successResponse({
      id: config.id,
      hasCode: true,
      hasDuressCode: !!config.duressPhraseHash,
      secondFactorType: config.secondFactorType,
      secondFactorQuestion: config.secondFactorQuestion,
      attemptsPerWindow: config.attemptsPerWindow,
      windowSeconds: config.windowSeconds,
      lockSeconds: config.lockSeconds,
      rotateReminderDays: config.rotateReminderDays,
    });
  } catch (error) {
    console.error("[code-config POST]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}

/**
 * GET /api/victim/code-config
 * Returns config metadata only (NO phrase hashes)
 */
export async function GET(request: NextRequest) {
  try {
    const result = await requireRole(request, "VICTIM");
    if (result instanceof NextResponse) return result;

    const config = await prisma.codeConfig.findUnique({
      where: { victimId: result.user.id },
    });

    if (!config) {
      return successResponse({ hasCode: false });
    }

    return successResponse({
      hasCode: true,
      hasDuressCode: !!config.duressPhraseHash,
      secondFactorType: config.secondFactorType,
      secondFactorQuestion: config.secondFactorQuestion,
      attemptsPerWindow: config.attemptsPerWindow,
      windowSeconds: config.windowSeconds,
      lockSeconds: config.lockSeconds,
      rotateReminderDays: config.rotateReminderDays,
    });
  } catch (error) {
    console.error("[code-config GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
