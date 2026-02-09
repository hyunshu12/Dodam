import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    // #region agent log
    console.log('[DEBUG][H1,H2] /api/auth/me:', JSON.stringify({userId:result.user.id,role:result.user.role,displayName:result.user.displayName,sessionRole:result.session.role}));
    fetch('http://127.0.0.1:7242/ingest/e9b5dedd-462b-4e37-895a-5212b39b1c11',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/me/route.ts:GET',message:'auth/me response',data:{userId:result.user.id,role:result.user.role,displayName:result.user.displayName,sessionRole:result.session.role,sessionUserId:result.session.userId},timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(()=>{});
    // #endregion

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
