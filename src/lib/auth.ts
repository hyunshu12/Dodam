/**
 * JWT-based authentication helpers
 * - Sign/verify tokens
 * - Cookie management
 * - Middleware helpers for API routes
 */
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { errorResponse } from "./errors";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_COOKIE = "ec-token";
const EMERGENCY_COOKIE = "ec-emergency";
const TOKEN_EXPIRY = "24h";

export interface TokenPayload {
  userId: string;
  role: string;
  /** Optional: used for temp tokens (emergency flow) */
  purpose?: string;
  victimId?: string;
  isDuress?: boolean;
}

/**
 * Sign a JWT
 */
export function signToken(
  payload: TokenPayload,
  expiresIn: string = TOKEN_EXPIRY
): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] });
}

/**
 * Verify and decode a JWT
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Set auth token as httpOnly cookie
 */
export async function setAuthCookie(token: string) {
  // #region agent log
  const decoded = verifyToken(token);
  console.log('[DEBUG][H1,H3] setAuthCookie called:', JSON.stringify({userId:decoded?.userId,role:decoded?.role,purpose:decoded?.purpose}));
  fetch('http://127.0.0.1:7242/ingest/e9b5dedd-462b-4e37-895a-5212b39b1c11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:setAuthCookie',message:'Setting auth cookie',data:{userId:decoded?.userId,role:decoded?.role,purpose:decoded?.purpose},timestamp:Date.now(),hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
}

/**
 * Clear auth cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  cookieStore.delete(EMERGENCY_COOKIE);
}

/**
 * Set emergency-only auth cookie (does NOT overwrite the main ec-token)
 */
export async function setEmergencyCookie(token: string) {
  // #region agent log
  const decoded = verifyToken(token);
  console.log('[DEBUG][FIX] setEmergencyCookie called:', JSON.stringify({userId:decoded?.userId,role:decoded?.role}));
  fetch('http://127.0.0.1:7242/ingest/e9b5dedd-462b-4e37-895a-5212b39b1c11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:setEmergencyCookie',message:'Setting EMERGENCY cookie (not overwriting main)',data:{userId:decoded?.userId,role:decoded?.role},timestamp:Date.now(),hypothesisId:'FIX'})}).catch(()=>{});
  // #endregion
  const cookieStore = await cookies();
  cookieStore.set(EMERGENCY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
}

/**
 * Get current session from request cookie.
 * By default checks main cookie first.
 * When preferEmergency=true (set via X-Emergency-Session header),
 * checks emergency cookie first — used by search page chat.
 */
export async function getSession(
  request?: NextRequest
): Promise<TokenPayload | null> {
  let token: string | undefined;
  let emergencyToken: string | undefined;
  const preferEmergency = request?.headers.get("x-emergency-session") === "true";

  if (request) {
    token = request.cookies.get(TOKEN_COOKIE)?.value;
    emergencyToken = request.cookies.get(EMERGENCY_COOKIE)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(TOKEN_COOKIE)?.value;
    emergencyToken = cookieStore.get(EMERGENCY_COOKIE)?.value;
  }

  if (preferEmergency) {
    // Emergency-first: for search page chat
    if (emergencyToken) {
      const session = verifyToken(emergencyToken);
      if (session) return session;
    }
    if (token) {
      const session = verifyToken(token);
      if (session) return session;
    }
  } else {
    // Normal: main cookie first (guardian dashboard, etc.)
    if (token) {
      const session = verifyToken(token);
      if (session) return session;
    }
    if (emergencyToken) {
      const session = verifyToken(emergencyToken);
      if (session) return session;
    }
  }

  return null;
}

/**
 * Require authenticated user - returns session or 401 response
 */
export async function requireAuth(
  request: NextRequest
): Promise<
  { session: TokenPayload; user: { id: string; role: string; displayName: string | null; email: string | null } } | NextResponse
> {
  const session = await getSession(request);
  if (!session) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, displayName: true, email: true },
  });

  if (!user) {
    return errorResponse("User not found", 401, "USER_NOT_FOUND");
  }

  return { session, user };
}

/**
 * Require a specific role - returns session or 403 response
 */
export async function requireRole(
  request: NextRequest,
  role: string
): Promise<
  { session: TokenPayload; user: { id: string; role: string; displayName: string | null; email: string | null } } | NextResponse
> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (result.user.role !== role) {
    return errorResponse("Forbidden: insufficient role", 403, "FORBIDDEN");
  }
  return result;
}
