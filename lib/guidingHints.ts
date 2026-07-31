import { BLOOM_LEVELS, type BloomLevel } from "./bloomLevels";

export type GuidingHint = {
  hint: string;
  targetBloomLevel: BloomLevel;
};

function isHintTarget(level: string): level is Exclude<BloomLevel, "기억"> {
  return level !== "기억" && (BLOOM_LEVELS as readonly string[]).includes(level);
}

// Gemini가 hints를 정상적으로 만들지 못했을 때만 쓰이는 안전망.
// (평소엔 학생이 다룬 구체적 소재를 담은 AI 생성 hints를 그대로 사용합니다)
const FALLBACK_HINTS: Record<Exclude<BloomLevel, "기억">, string[]> = {
  이해: [
    "그 일이 무슨 뜻인지 내 말로 설명해보면?",
    "그때 무슨 일이 있었는지 순서대로 정리해보면?",
  ],
  적용: [
    "이 방법을 다른 상황에도 써본다면 어떻게 될까?",
    "지금 우리 생활에도 적용해볼 수 있을까?",
  ],
  분석: [
    "서로 비교하면 무엇이 다를까?",
    "왜 그런 일이 일어났을지 이유를 생각해보면?",
  ],
  평가: [
    "그 선택이 옳았을까? 그렇게 생각한 이유는?",
    "내가 그 사람이었다면 어떻게 했을지 생각해보면?",
  ],
  창조: [
    "다른 방법은 없었을지 생각해보면?",
    "내가 새로운 방법을 만들어본다면 어떻게 할까?",
  ],
};
const FALLBACK_TARGET: Exclude<BloomLevel, "기억"> = "분석";

// teacherFeedback/recommendedTargetLevel과 같은 Gemini 응답에서 나온 값이므로
// 굳이 따로 계산하지 않고 그대로 씁니다. 이렇게 해야 "총평은 분석/평가를 권하는데
// 힌트는 이해만 나오는" 식의 불일치가 생기지 않습니다. hints 자체(문구)는 AI가
// 학생이 실제로 다룬 소재를 담아 쓴 것을 그대로 쓰고, 응답이 비정상일 때만
// 안전망 문구로 대체합니다.
export function buildGuidingHints(
  hints: unknown,
  recommendedTargetLevel: string
): GuidingHint[] {
  const target = isHintTarget(recommendedTargetLevel)
    ? recommendedTargetLevel
    : FALLBACK_TARGET;

  const texts =
    Array.isArray(hints) &&
    hints.length > 0 &&
    hints.every((h) => typeof h === "string")
      ? (hints as string[])
      : FALLBACK_HINTS[target];

  return texts.map((hint) => ({ hint, targetBloomLevel: target }));
}
