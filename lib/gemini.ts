import "server-only";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const SYSTEM_PROMPT =
  "너는 역사 수업 전문가야. 입력으로 번호가 매겨진 학생의 질문 목록이 주어질거야. " +
  "이 질문들은 학생이 역사 인물 챗봇과 나눈 대화 중 학생 자신이 물어본 부분만 추출한 것이야. " +
  "절대로 질문들을 하나로 합쳐서 분석하지 말고, 각 질문을 독립적으로 하나씩 분석해. " +
  "각 질문마다 1) 질문 유형(사실 확인형/탐구형)을 분류하고, 2) 사고력 점수(10점 만점)를 평가해. " +
  "그 다음 이 학생의 전체 질문 경향을 보고 교사가 참고할 한두 문장의 피드백을 작성해 " +
  "(예: 이 학생은 사실 확인형 질문 위주이므로 탐구형으로 이어질 심화 질문을 유도할 필요가 있음). " +
  "마지막으로 교사가 이 학생에게 던져주면 좋을 심화 질문 2개를 제안해. " +
  "단, 텍스트에 학생의 실명이 포함되어 있을 경우 이를 무시하고 교육적 내용에만 집중해. " +
  "결과는 반드시 JSON 형식으로만 출력해.";

export type QuestionAnalysis = {
  question: string;
  questionType: string;
  thinkingScore: number;
};

export type AnalysisResult = {
  questions: QuestionAnalysis[];
  teacherFeedback: string;
  followUpQuestions: string[];
};

// 분석 실패(키 누락, API 오류, JSON 파싱 실패 등) 시 null을 반환합니다.
// 학생의 질문 저장 자체는 분석 성공 여부와 무관하게 계속 진행되어야 합니다.
export async function analyzeQuestions(
  questions: string[]
): Promise<AnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || questions.length === 0) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            questions: {
              type: SchemaType.ARRAY,
              description: "입력된 질문 각각에 대한 독립적인 분석 결과",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  question: { type: SchemaType.STRING },
                  questionType: {
                    type: SchemaType.STRING,
                    description: "사실 확인형 또는 탐구형",
                  },
                  thinkingScore: {
                    type: SchemaType.INTEGER,
                    description: "1~10 사이의 사고력 점수",
                  },
                },
                required: ["question", "questionType", "thinkingScore"],
              },
            },
            teacherFeedback: {
              type: SchemaType.STRING,
              description: "질문 경향에 대한 교사용 피드백 한두 문장",
            },
            followUpQuestions: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "교사용 심화 질문 2개",
            },
          },
          required: ["questions", "teacherFeedback", "followUpQuestions"],
        },
      },
    });

    const numberedQuestions = questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");

    const result = await model.generateContent(numberedQuestions);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (
      !Array.isArray(parsed.questions) ||
      typeof parsed.teacherFeedback !== "string" ||
      !Array.isArray(parsed.followUpQuestions)
    ) {
      return null;
    }

    return parsed as AnalysisResult;
  } catch (err) {
    console.error("Gemini 분석 실패:", err);
    return null;
  }
}
