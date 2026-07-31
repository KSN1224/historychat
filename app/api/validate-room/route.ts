import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidRoomCode } from "@/lib/roomCode";

// 학생(비로그인) 페이지에서 방번호 유효성만 확인하는 공개 엔드포인트.
// teachers/rooms의 다른 컬럼(email 등)은 절대 응답에 포함하지 않습니다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";

  if (!isValidRoomCode(code)) {
    return NextResponse.json({ valid: false });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("rooms")
    .select("id")
    .eq("room_code", code)
    .maybeSingle();

  return NextResponse.json({ valid: Boolean(data) });
}
