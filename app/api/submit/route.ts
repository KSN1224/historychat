import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeQuestions, analyzeWorksheetImage } from "@/lib/gemini";
import { extractStudentQuestions } from "@/lib/parseQuestions";
import { isValidRoomCode, isValidStudentNumber } from "@/lib/roomCode";

// 챗봇과의 대화 전체를 붙여넣는 경우까지 고려한 넉넉한 길이 제한
const MAX_QUESTION_LENGTH = 3000;

// 학습지 사진 업로드 용량 제한 (Vercel 서버리스 함수 요청 본문 한도를 고려한 값)
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const roomCode = String(formData.get("roomCode") ?? "");
  const studentNumber = String(formData.get("studentNumber") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const worksheetImage = formData.get("worksheetImage");
  const imageFile = worksheetImage instanceof File ? worksheetImage : null;

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
  if (!question && !imageFile) {
    return NextResponse.json(
      { error: "질문을 입력하거나 학습지 사진을 첨부해주세요." },
      { status: 400 }
    );
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `질문을 ${MAX_QUESTION_LENGTH}자 이내로 입력해주세요.` },
      { status: 400 }
    );
  }
  if (imageFile) {
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "이미지 용량이 너무 큽니다. 8MB 이하로 업로드해주세요." },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();

  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (!room) {
    return NextResponse.json(
      { error: "존재하지 않는 방번호입니다." },
      { status: 400 }
    );
  }

  // Gemini 분석은 실패해도 학생의 질문 저장을 막지 않습니다.
  // 학습지 사진이 첨부된 경우 손글씨 답변을 추출/채점하고, 이미지 자체는 저장하지 않습니다.
  let analysisResult;
  if (imageFile) {
    const imageBytes = Buffer.from(await imageFile.arrayBuffer());
    const worksheetResult = await analyzeWorksheetImage(
      question,
      imageBytes.toString("base64"),
      imageFile.type
    );
    analysisResult = worksheetResult
      ? { type: "worksheet" as const, ...worksheetResult }
      : null;
  } else {
    // "나 : ..." 형식의 학생 발화만 추출 (챗봇 답변 등 나머지는 버림).
    // 매칭되는 줄이 없으면 입력 전체를 질문 1개로 취급합니다.
    const extractedQuestions = extractStudentQuestions(question);
    analysisResult = await analyzeQuestions(extractedQuestions);
  }

  const { error: insertError } = await admin.from("students").insert({
    room_id: room.id,
    room_code: roomCode,
    student_number: studentNumber,
    question: question || "(질문 없이 학습지 사진만 제출됨)",
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
