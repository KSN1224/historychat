import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSessionNumber } from "@/lib/roomCode";

// 특정 차시의 방을 완전히 삭제합니다 (학생 제출 기록도 함께 삭제됨, FK cascade).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sessionNumber = Number(body?.sessionNumber);

  if (!isValidSessionNumber(sessionNumber)) {
    return NextResponse.json(
      { error: "차시는 1~7 사이여야 합니다." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 소유권 확인 후 서비스 롤로 삭제 (rooms에는 delete 정책을 부여하지 않았으므로).
  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("teacher_id", user.id)
    .eq("session_number", sessionNumber)
    .maybeSingle();

  if (!room) {
    return NextResponse.json(
      { error: "삭제할 차시를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { error: deleteError } = await admin
    .from("rooms")
    .delete()
    .eq("id", room.id);

  if (deleteError) {
    return NextResponse.json(
      { error: "삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
