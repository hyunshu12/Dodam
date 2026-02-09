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
    // #region agent log
    console.log('[DEBUG][H3] login setting cookie:', JSON.stringify({userId:user.id,role:user.role,email:user.email}));
    fetch('http://127.0.0.1:7242/ingest/e9b5dedd-462b-4e37-895a-5212b39b1c11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/login/route.ts:POST',message:'Login setting cookie',data:{userId:user.id,role:user.role,email:user.email},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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
