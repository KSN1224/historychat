import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("room_code")
    .eq("id", user.id)
    .single();

  if (!teacher?.room_code) {
    return NextResponse.json(
      { error: "생성된 교실이 없습니다." },
      { status: 400 }
    );
  }

  // RLS students_delete_owner 정책이 이 교실(room_code)의 소유자만 삭제 가능하도록 보장합니다.
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("room_code", teacher.room_code);

  if (error) {
    return NextResponse.json(
      { error: "초기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
