import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BLOOM_LEVELS } from "@/lib/bloomLevels";

const MIN_SCORE = 1;
const MAX_SCORE = 10;

// 교사가 AI의 블룸 단계/사고력 점수 판정을 직접 수정할 때 호출하는 라우트.
// students 테이블에는 authenticated용 update 정책이 없으므로(서버만 기록),
// 여기서 소유권(rooms.teacher_id)을 직접 확인한 뒤 service role로 갱신합니다.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const studentId = Number((await params).id);
  if (!Number.isInteger(studentId)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const bloomLevel = body?.bloomLevel;
  const thinkingScore = Number(body?.thinkingScore);
  const questionIndex =
    body?.questionIndex === null || body?.questionIndex === undefined
      ? null
      : Number(body.questionIndex);

  if (
    typeof bloomLevel !== "string" ||
    !(BLOOM_LEVELS as readonly string[]).includes(bloomLevel) ||
    !Number.isInteger(thinkingScore) ||
    thinkingScore < MIN_SCORE ||
    thinkingScore > MAX_SCORE
  ) {
    return NextResponse.json({ error: "잘못된 값입니다." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: student } = await admin
    .from("students")
    .select("id, room_id, analysis_result")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  }

  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("id", student.room_id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const analysis = student.analysis_result;
  if (!analysis) {
    return NextResponse.json(
      { error: "분석 결과가 없습니다." },
      { status: 400 }
    );
  }

  let updatedAnalysis;
  if (analysis.type === "worksheet") {
    updatedAnalysis = {
      ...analysis,
      bloomLevel,
      thinkingScore,
      editedByTeacher: true,
    };
  } else {
    const questions = Array.isArray(analysis.questions)
      ? [...analysis.questions]
      : [];

    if (
      questionIndex === null ||
      !Number.isInteger(questionIndex) ||
      questionIndex < 0 ||
      questionIndex >= questions.length
    ) {
      return NextResponse.json(
        { error: "잘못된 질문 인덱스입니다." },
        { status: 400 }
      );
    }

    questions[questionIndex] = {
      ...questions[questionIndex],
      bloomLevel,
      thinkingScore,
      editedByTeacher: true,
    };
    updatedAnalysis = { ...analysis, questions };
  }

  const { error: updateError } = await admin
    .from("students")
    .update({ analysis_result: updatedAnalysis })
    .eq("id", studentId);

  if (updateError) {
    return NextResponse.json(
      { error: "수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, analysis_result: updatedAnalysis });
}
