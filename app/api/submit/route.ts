import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeQuestions } from "@/lib/gemini";
import { extractStudentQuestions } from "@/lib/parseQuestions";
import { isValidRoomCode, isValidStudentNumber } from "@/lib/roomCode";

// 챗봇과의 대화 전체를 붙여넣는 경우까지 고려한 넉넉한 길이 제한
const MAX_QUESTION_LENGTH = 3000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const roomCode = String(body?.roomCode ?? "");
  const studentNumber = String(body?.studentNumber ?? "");
  const question = String(body?.question ?? "").trim();

  if (!isValidRoomCode(roomCode)) {
    return NextResponse.json(
      { error: "방번호가 올바르지 않습니다." },
      { status: 400 }
    );
  }
  if (!isValidStudentNumber(studentNumber)) {
    return NextResponse.json(
      { error: "개인번호는 2자리 숫자로 입력해주세요." },
      { status: 400 }
    );
  }
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `질문을 ${MAX_QUESTION_LENGTH}자 이내로 입력해주세요.` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (!teacher) {
    return NextResponse.json(
      { error: "존재하지 않는 방번호입니다." },
      { status: 400 }
    );
  }

  // "나 : ..." 형식의 학생 발화만 추출 (챗봇 답변 등 나머지는 버림).
  // 매칭되는 줄이 없으면 입력 전체를 질문 1개로 취급합니다.
  const extractedQuestions = extractStudentQuestions(question);

  // Gemini 분석은 실패해도 학생의 질문 저장을 막지 않습니다.
  const analysisResult = await analyzeQuestions(extractedQuestions);

  const { error: insertError } = await admin.from("students").insert({
    room_code: roomCode,
    student_number: studentNumber,
    question,
    analysis_result: analysisResult,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "제출 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
