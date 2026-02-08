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
}

/**
 * Get current session from request cookie
 */
export async function getSession(
  request?: NextRequest
): Promise<TokenPayload | null> {
  let token: string | undefined;

  if (request) {
    token = request.cookies.get(TOKEN_COOKIE)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(TOKEN_COOKIE)?.value;
  }

  if (!token) return null;
  return verifyToken(token);
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
