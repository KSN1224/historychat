import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { BLOOM_LEVELS } from "@/lib/bloomLevels";

const MIN_SCORE = 1;
const MAX_SCORE = 10;

// 로그인한 교사가 이 student row(가 속한 room)의 소유자인지 확인합니다.
// students 테이블에는 authenticated용 update/delete 정책이 없으므로(서버만 기록),
// 여기서 소유권을 직접 확인한 뒤 service role로 갱신/삭제합니다.
async function requireOwnedStudent(
  admin: AdminClient,
  studentId: number,
  teacherId: string
) {
  const { data: student } = await admin
    .from("students")
    .select("id, room_id, analysis_result")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return { error: "찾을 수 없습니다.", status: 404 } as const;

  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("id", student.room_id)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (!room) return { error: "권한이 없습니다.", status: 403 } as const;

  return { student } as const;
}

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
  const owned = await requireOwnedStudent(admin, studentId, user.id);
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const analysis = owned.student.analysis_result;
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

// 교사가 실수로 등록된 질문(또는 학습지 제출) 하나를 삭제할 때 호출하는 라우트.
// 채팅형 분석에서 여러 질문 중 하나만 지우는 경우엔 해당 질문만 배열에서 제거하고,
// 그 질문이 마지막 하나였거나 학습지 타입인 경우엔 제출 행 자체를 삭제합니다.
export async function DELETE(
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

  const body = await request.json().catch(() => ({}));
  const questionIndex =
    body?.questionIndex === null || body?.questionIndex === undefined
      ? null
      : Number(body.questionIndex);

  const admin = createAdminClient();
  const owned = await requireOwnedStudent(admin, studentId, user.id);
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const analysis = owned.student.analysis_result;
  const questions =
    analysis && analysis.type !== "worksheet" && Array.isArray(analysis.questions)
      ? analysis.questions
      : null;

  const shouldDeleteWholeRow =
    !analysis ||
    analysis.type === "worksheet" ||
    !questions ||
    questionIndex === null ||
    !Number.isInteger(questionIndex) ||
    questionIndex < 0 ||
    questionIndex >= questions.length ||
    questions.length <= 1;

  if (shouldDeleteWholeRow) {
    const { error: deleteError } = await admin
      .from("students")
      .delete()
      .eq("id", studentId);

    if (deleteError) {
      return NextResponse.json(
        { error: "삭제 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedRow: true });
  }

  const remainingQuestions = questions.filter(
    (_: unknown, i: number) => i !== questionIndex
  );
  const updatedAnalysis = { ...analysis, questions: remainingQuestions };

  const { error: updateError } = await admin
    .from("students")
    .update({ analysis_result: updatedAnalysis })
    .eq("id", studentId);

  if (updateError) {
    return NextResponse.json(
      { error: "삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedRow: false,
    analysis_result: updatedAnalysis,
  });
}
