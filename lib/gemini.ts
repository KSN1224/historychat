import "server-only";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const SYSTEM_PROMPT =
  "너는 역사 수업 전문가야. 입력으로 번호가 매겨진 학생의 질문 목록이 주어질거야. " +
  "이 질문들은 학생이 역사 인물 챗봇과 나눈 대화 중 학생 자신이 물어본 부분만 추출한 것이야. " +
  "절대로 질문들을 하나로 합쳐서 분석하지 말고, 각 질문을 독립적으로 하나씩 분석해. " +
  "각 질문마다 1) 블룸(Bloom)의 교육목표 분류학 인지적 영역 6단계(기억, 이해, 적용, 분석, 평가, 창조) " +
  "중 이 질문이 어디에 해당하는지 분류하고, 2) 사고력 점수(10점 만점)를 평가해. " +
  "그 다음 이 학생의 질문들이 블룸의 6단계 중 주로 어느 수준에 머물러 있는지 총평을 작성해 " +
  "(예: 이 학생은 '기억/이해' 단계의 질문 위주이므로 '분석/평가' 단계로 나아갈 수 있도록 유도할 필요가 있음). " +
  "마지막으로 교사가 이 학생에게 다음으로 물어보면 좋을 질문을 2개 추천해. " +
  "이 질문은 학생이 이미 한 질문과 비슷한 수준이거나 거기서 한 단계 정도만 살짝 높인 수준이어야 하고, " +
  "초등학생이 바로 이해할 수 있는 쉽고 구체적인 말로, 교사가 그대로 학생에게 물어볼 수 있는 질문 문장으로 작성해. " +
  "너무 어렵거나 추상적인 표현, 큰 폭의 도약은 피해. " +
  "단, 텍스트에 학생의 실명이 포함되어 있을 경우 이를 무시하고 교육적 내용에만 집중해. " +
  "결과는 반드시 JSON 형식으로만 출력해.";

export type QuestionAnalysis = {
  question: string;
  bloomLevel: string;
  thinkingScore: number;
};

export type AnalysisResult = {
  questions: QuestionAnalysis[];
  teacherFeedback: string;
  guidingComments: string[];
};

const WORKSHEET_SYSTEM_PROMPT =
  "너는 초등학교 역사 수업 채점을 돕는 보조 교사야. 입력으로 학습지 문제(질문, 없을 수도 있음)와 " +
  "학생이 학습지에 손으로 쓴 답변이 담긴 사진이 주어질거야. " +
  "1) 사진에서 학생이 직접 작성한 손글씨 답변 영역을 정확히 찾아라. " +
  "2) 그 답변 내용만 텍스트로 정확히 추출해라 (인쇄된 문제 텍스트나 다른 문제의 답은 포함하지 마라). " +
  "3) 사진에 답변이 전혀 쓰여있지 않으면 status를 blank로, 손글씨를 알아볼 수 없으면 status를 illegible로 설정하고 " +
  "extractedAnswer에는 각각 '미작성', '판독 불가'라고 적어라. " +
  "4) 답변을 읽을 수 있는 경우, 질문이 주어졌다면 그 질문과 결합해 정답 여부(correctness)를 판단해라. " +
  "질문이 따로 주어지지 않았다면 사진에 인쇄된 문제가 있는지 먼저 확인해서 그것을 기준으로 판단하고, " +
  "그마저도 없다면 정답 여부를 판단하지 말고 correctness를 '판단 불가'로 설정해라. " +
  "이 경우에도 feedback에는 추출된 답변 내용에 대한 격려와 코멘트를 한두 문장으로 작성해라. " +
  "답변을 읽을 수 있고 정답 여부도 판단한 경우, 초등학생 눈높이에 맞는 격려 섞인 교육적 피드백(feedback)을 한두 문장으로 작성해라. " +
  "판단이 불가능한 경우(blank/illegible) correctness는 '판단 불가'로, feedback에는 다시 작성하도록 안내하는 문구를 적어라. " +
  "결과는 반드시 JSON 형식으로만 출력해.";

export type WorksheetAnalysisResult = {
  extractedAnswer: string;
  status: "answered" | "blank" | "illegible";
  correctness: string;
  feedback: string;
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
                  bloomLevel: {
                    type: SchemaType.STRING,
                    description:
                      "블룸의 인지적 영역 6단계 중 하나: 기억, 이해, 적용, 분석, 평가, 창조",
                  },
                  thinkingScore: {
                    type: SchemaType.INTEGER,
                    description: "1~10 사이의 사고력 점수",
                  },
                },
                required: ["question", "bloomLevel", "thinkingScore"],
              },
            },
            teacherFeedback: {
              type: SchemaType.STRING,
              description:
                "학생의 질문들이 블룸의 6단계 중 주로 어느 수준에 머물러 있는지에 대한 총평 (한두 문장)",
            },
            guidingComments: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "학생 수준과 비슷하거나 한 단계만 살짝 높인, 쉬운 말로 된 추천 질문 2개",
            },
          },
          required: ["questions", "teacherFeedback", "guidingComments"],
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
      !Array.isArray(parsed.guidingComments)
    ) {
      return null;
    }

    return parsed as AnalysisResult;
  } catch (err) {
    console.error("Gemini 분석 실패:", err);
    return null;
  }
}

// 학습지 사진(손글씨 답변)을 Gemini로 분석합니다. 이미지는 저장하지 않고
// 분석 목적으로만 사용됩니다. 실패 시(키 누락, API 오류, JSON 파싱 실패 등) null 반환.
export async function analyzeWorksheetImage(
  question: string,
  imageBase64: string,
  mimeType: string
): Promise<WorksheetAnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !imageBase64) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      systemInstruction: WORKSHEET_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            extractedAnswer: {
              type: SchemaType.STRING,
              description:
                "사진에서 추출한 학생의 손글씨 답변. 미작성 시 '미작성', 판독 불가 시 '판독 불가'",
            },
            status: {
              type: SchemaType.STRING,
              description: "answered, blank, illegible 중 하나",
            },
            correctness: {
              type: SchemaType.STRING,
              description: "정답/오답/부분 정답/판단 불가 중 하나",
            },
            feedback: {
              type: SchemaType.STRING,
              description: "학생에게 보여줄 한두 문장의 교육적 피드백",
            },
          },
          required: ["extractedAnswer", "status", "correctness", "feedback"],
        },
      },
    });

    const questionText = question.trim()
      ? `학습지 문제(질문): ${question}`
      : "학습지 문제(질문)가 따로 입력되지 않았습니다. 사진에 인쇄된 문제가 있다면 그것을 기준으로 채점하고, 없다면 정답 여부는 판단하지 마세요.";

    const result = await model.generateContent([
      { text: questionText },
      { inlineData: { mimeType, data: imageBase64 } },
    ]);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (
      typeof parsed.extractedAnswer !== "string" ||
      typeof parsed.status !== "string" ||
      typeof parsed.correctness !== "string" ||
      typeof parsed.feedback !== "string"
    ) {
      return null;
    }

    return parsed as WorksheetAnalysisResult;
  } catch (err) {
    console.error("Gemini 학습지 분석 실패:", err);
    return null;
  }
}
