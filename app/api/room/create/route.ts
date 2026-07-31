import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRoomCode, isValidSessionNumber } from "@/lib/roomCode";

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

  const { data: existingRoom } = await admin
    .from("rooms")
    .select("id")
    .eq("teacher_id", user.id)
    .eq("session_number", sessionNumber)
    .maybeSingle();

  if (existingRoom) {
    return NextResponse.json(
      { error: "이미 만들어진 차시입니다. 다시 만들려면 먼저 삭제해주세요." },
      { status: 400 }
    );
  }

  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateRoomCode();
    const { data: existing } = await admin
      .from("rooms")
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

  const { data: room, error: insertError } = await admin
    .from("rooms")
    .insert({
      teacher_id: user.id,
      session_number: sessionNumber,
      room_code: code,
    })
    .select("id, room_code, session_number")
    .single();

  if (insertError || !room) {
    return NextResponse.json(
      { error: "방 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    roomId: room.id,
    roomCode: room.room_code,
    sessionNumber: room.session_number,
  });
}
