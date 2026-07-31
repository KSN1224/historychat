import { BLOOM_LEVELS, type BloomLevel } from "./bloomLevels";

export type GuidingHint = {
  hint: string;
  targetBloomLevel: BloomLevel;
};

// 학생에게 완성된 예시 질문을 그대로 주면, 학생은 그 질문을 "받아 적을" 뿐 스스로
// 다음 단계 질문을 만드는 연습은 되지 않습니다. 그래서 완성 문장 대신, 학생이
// 자기 소재(인물/사건)를 직접 채워 넣는 재사용 가능한 "질문 틀"을 목표 단계별로
// 미리 마련해두고, 실제 어떤 틀을 보여줄지만 학생의 현재 수준에 따라 골라줍니다.
const HINT_TEMPLATES: Record<Exclude<BloomLevel, "기억">, string[]> = {
  이해: [
    "그 일이 무슨 뜻인지 내 말로 설명해보면?",
    "그때 무슨 일이 있었는지 순서대로 정리해보면?",
  ],
  적용: [
    "이 방법을 다른 상황에도 써본다면 어떻게 될까?",
    "지금 우리 생활에도 적용해볼 수 있을까?",
  ],
  분석: [
    "◯◯와 ◯◯을 비교하면 무엇이 다를까?",
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

// 배열에서 한 단계 위 레벨을 반환합니다. 이미 최상위(창조)면 그대로 유지.
// idx+1이 최소 1이므로 "기억"이 반환될 일은 없습니다.
function oneStepUp(level: BloomLevel): Exclude<BloomLevel, "기억"> {
  const idx = BLOOM_LEVELS.indexOf(level);
  const next = BLOOM_LEVELS[Math.min(idx + 1, BLOOM_LEVELS.length - 1)];
  return next as Exclude<BloomLevel, "기억">;
}

// 학생의 이번 제출에서 가장 많이 나온 블룸 단계를 "현재 수준"으로 보고,
// 그보다 한 단계 위를 목표로 하는 질문 틀 2개를 골라줍니다.
export function computeGuidingHints(
  questions: { bloomLevel: string }[]
): GuidingHint[] {
  if (questions.length === 0) return [];

  const counts = new Map<string, number>();
  for (const q of questions) {
    counts.set(q.bloomLevel, (counts.get(q.bloomLevel) ?? 0) + 1);
  }

  // 동률이면 더 기초적인(배열 앞쪽) 단계를 현재 수준으로 봅니다.
  let dominant: BloomLevel = BLOOM_LEVELS[0];
  let bestCount = -1;
  for (const level of BLOOM_LEVELS) {
    const count = counts.get(level) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      dominant = level;
    }
  }

  const target = oneStepUp(dominant);
  return HINT_TEMPLATES[target].map((hint) => ({
    hint,
    targetBloomLevel: target,
  }));
}
