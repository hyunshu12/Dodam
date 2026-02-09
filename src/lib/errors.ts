/**
 * Unified API response helpers
 * All API routes use these to ensure consistent JSON response format:
 * { ok: boolean, data?: T, error?: { code: string, message: string } }
 */
import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Success response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { ok: true, data },
    { status }
  );
}

/**
 * Error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  code: string = "BAD_REQUEST"
) {
  return NextResponse.json<ApiResponse>(
    { ok: false, error: { code, message } },
    { status }
  );
}

/**
 * Wrap an async route handler with error catching
 */
export function withErrorHandler(
  handler: (request: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (request: Request, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error("[API Error]", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return errorResponse(message, 500, "INTERNAL_ERROR");
    }
  };
}
