import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRoomCode } from "@/lib/roomCode";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();

  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateRoomCode();
    const { data: existing } = await admin
      .from("teachers")
      .select("id")
      .eq("room_code", candidate)
      .maybeSingle();

    if (!existing) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return NextResponse.json(
      { error: "방 코드 생성에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }

  const { error: updateError } = await admin
    .from("teachers")
    .update({ room_code: code, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "방 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ roomCode: code });
}
