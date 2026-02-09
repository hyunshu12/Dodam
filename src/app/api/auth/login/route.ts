import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareHash } from "@/lib/crypto";
import { signToken, setAuthCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return errorResponse("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const valid = await compareHash(password, user.passwordHash);
    if (!valid) {
      return errorResponse("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // Sign token and set cookie
    const token = signToken({ userId: user.id, role: user.role });
    await setAuthCookie(token);

    return successResponse({
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    });
  } catch (error) {
    console.error("[login]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
