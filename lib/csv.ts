export type QuestionAnalysis = {
  question: string;
  questionType: string;
  thinkingScore: number;
};

export type ChatAnalysisResult = {
  // 기존에 저장된 데이터에는 type 필드가 없으므로 optional로 둡니다.
  type?: "chat";
  questions: QuestionAnalysis[];
  teacherFeedback: string;
  followUpQuestions: string[];
};

export type WorksheetAnalysisResult = {
  type: "worksheet";
  extractedAnswer: string;
  status: "answered" | "blank" | "illegible";
  correctness: string;
  feedback: string;
};

export type StudentRow = {
  id: number;
  student_number: string;
  question: string;
  analysis_result: ChatAnalysisResult | WorksheetAnalysisResult | null;
  created_at: string;
};

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadStudentsCsv(rows: StudentRow[], roomCode: string) {
  const header = [
    "개인번호",
    "원문",
    "질문별 분석(유형/점수)",
    "교사 피드백",
    "심화질문1",
    "심화질문2",
    "제출시각",
  ];
  const lines = [header.map(escapeCsvField).join(",")];

  for (const row of rows) {
    const analysis = row.analysis_result;
    const isWorksheet = analysis?.type === "worksheet";

    const perQuestionSummary = isWorksheet
      ? `${analysis.extractedAnswer} [${analysis.correctness}]`
      : analysis?.questions
          ?.map((q) => `${q.question} [${q.questionType}/${q.thinkingScore}점]`)
          .join(" | ") ?? "";

    lines.push(
      [
        row.student_number,
        row.question,
        perQuestionSummary,
        (isWorksheet ? analysis.feedback : analysis?.teacherFeedback) ?? "",
        isWorksheet ? "" : analysis?.followUpQuestions?.[0] ?? "",
        isWorksheet ? "" : analysis?.followUpQuestions?.[1] ?? "",
        new Date(row.created_at).toLocaleString("ko-KR"),
      ]
        .map((v) => escapeCsvField(String(v)))
        .join(",")
    );
  }

  // BOM 포함: 엑셀에서 한글 깨짐 방지
  const csvContent = "﻿" + lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historychat_room${roomCode}_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
