import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    return successResponse({
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      displayName: result.user.displayName,
    });
  } catch (error) {
    console.error("[me]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
