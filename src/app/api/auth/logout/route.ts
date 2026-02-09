import { clearAuthCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/errors";

export async function POST() {
  try {
    await clearAuthCookie();
    return successResponse({ message: "Logged out" });
  } catch (error) {
    console.error("[logout]", error);
    return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
