import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseForResponse } from "@/lib/supabase/route-handler";
import { clearActivityCookies } from "@/lib/session-activity-server";

export async function POST() {
  try {
    const response = NextResponse.json({ message: "Logged out successfully" });
    const supabase = await createSupabaseForResponse(response);

    try {
      await supabase.auth.signOut();
    } catch {
      // Continue even if signOut fails — we'll clear cookies manually below
    }

    clearActivityCookies(response);

    // Explicitly delete all Supabase auth cookies (including chunked tokens)
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
        });
      }
    }

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
