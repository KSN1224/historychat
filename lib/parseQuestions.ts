// 학생이 역사 인물 챗봇과 나눈 대화 전체를 붙여넣었을 때,
// "나 : ..." 형식으로 시작하는 학생 자신의 발화(질문)만 추출합니다.
// 챗봇(역사 인물)의 답변 줄은 무시됩니다.
//
// "나 :", "나:", "나 ：" 등 콜론 앞뒤 공백/전각 콜론을 모두 허용합니다.
// 위 형식과 일치하는 줄이 하나도 없으면(=그냥 질문 하나만 입력한 경우)
// 입력 전체를 질문 1개로 취급합니다.
const STUDENT_LINE_PATTERN = /^\s*나\s*[:：]\s*(.+)$/;

export function extractStudentQuestions(raw: string): string[] {
  const lines = raw.split(/\r?\n/);

  const studentLines = lines
    .map((line) => line.match(STUDENT_LINE_PATTERN)?.[1]?.trim())
    .filter((line): line is string => Boolean(line));

  if (studentLines.length > 0) {
    return studentLines;
  }

  const trimmed = raw.trim();
  return trimmed ? [trimmed] : [];
}
