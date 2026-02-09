import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashValue, encrypt } from "@/lib/crypto";
import { signToken, setAuthCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role, displayName, phone, birthDate } = body;

    // ── Validation ───────────────────────────
    if (!email || typeof email !== "string") {
      return errorResponse("이메일을 입력해주세요.", 400, "EMAIL_REQUIRED");
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(
        "올바른 이메일 형식을 입력해주세요.",
        400,
        "INVALID_EMAIL"
      );
    }

    if (!password || typeof password !== "string") {
      return errorResponse("비밀번호를 입력해주세요.", 400, "PASSWORD_REQUIRED");
    }

    if (password.length < 6) {
      return errorResponse(
        "비밀번호는 6자 이상이어야 합니다.",
        400,
        "PASSWORD_TOO_SHORT"
      );
    }

    if (!role || !["VICTIM", "GUARDIAN"].includes(role)) {
      return errorResponse(
        '역할은 "VICTIM" 또는 "GUARDIAN"이어야 합니다.',
        400,
        "INVALID_ROLE"
      );
    }

    if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
      return errorResponse("이름을 입력해주세요.", 400, "NAME_REQUIRED");
    }

    // Phone validation (optional but if provided, must be digits only)
    if (phone && typeof phone === "string") {
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        return errorResponse(
          "전화번호는 10~11자리 숫자여야 합니다.",
          400,
          "INVALID_PHONE"
        );
      }
    }

    // BirthDate validation (optional, format: YYYY-MM-DD)
    let parsedBirthDate: Date | null = null;
    if (birthDate && typeof birthDate === "string") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(birthDate)) {
        return errorResponse(
          "생년월일은 YYYY-MM-DD 형식이어야 합니다.",
          400,
          "INVALID_BIRTHDATE"
        );
      }
      parsedBirthDate = new Date(birthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        return errorResponse(
          "유효하지 않은 생년월일입니다.",
          400,
          "INVALID_BIRTHDATE"
        );
      }
    }

    // ── Check existing user ──────────────────
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return errorResponse(
        "이미 등록된 이메일입니다.",
        409,
        "DUPLICATE_EMAIL"
      );
    }

    // ── Create user ──────────────────────────
    const passwordHash = await hashValue(password);

    // Encrypt phone if provided
    let encryptedPhone: string | null = null;
    if (phone && typeof phone === "string" && phone.trim()) {
      const phoneDigits = phone.replace(/\D/g, "");
      encryptedPhone = encrypt(phoneDigits);
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        displayName: displayName.trim(),
        phone: encryptedPhone,
        birthDate: parsedBirthDate,
      },
    });

    // ── Sign token and set cookie ────────────
    const token = signToken({ userId: user.id, role: user.role });
    await setAuthCookie(token);

    return successResponse(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
      201
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    console.error("[signup] Error:", errMsg);
    console.error("[signup] Stack:", errStack);
    return errorResponse(
      `서버 오류가 발생했습니다: ${errMsg}`,
      500,
      "INTERNAL_ERROR"
    );
  }
}
