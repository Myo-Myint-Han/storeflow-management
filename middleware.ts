import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    // ⚡ Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise<NextResponse>((_, reject) => {
      setTimeout(() => reject(new Error("Middleware timeout")), 8000);
    });

    const sessionPromise = updateSession(request);

    // Race between timeout and session update
    return await Promise.race([sessionPromise, timeoutPromise]);
  } catch (error) {
    console.error("Middleware error:", error);
    // ⚡ On error, pass through without blocking
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
