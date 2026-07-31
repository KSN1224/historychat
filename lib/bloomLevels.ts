// 블룸(Bloom)의 교육목표 분류학 인지적 영역 6단계.
// 대시보드 배지와 성장 리포트 띠그래프가 같은 순서/색을 쓰도록 여기서 공유합니다.
export const BLOOM_LEVELS = [
  "기억",
  "이해",
  "적용",
  "분석",
  "평가",
  "창조",
] as const;

export type BloomLevel = (typeof BLOOM_LEVELS)[number];

export const BLOOM_LEVEL_BADGE_STYLES: Record<string, string> = {
  기억: "bg-slate-600 text-white",
  이해: "bg-sky-600 text-white",
  적용: "bg-emerald-600 text-white",
  분석: "bg-amber-600 text-white",
  평가: "bg-purple-600 text-white",
  창조: "bg-rose-600 text-white",
};

// 띠그래프 등 배경색이 필요한 곳에서 사용하는 hex 값 (badge 색과 동일 계열).
export const BLOOM_LEVEL_HEX: Record<string, string> = {
  기억: "#475569",
  이해: "#0284c7",
  적용: "#059669",
  분석: "#d97706",
  평가: "#9333ea",
  창조: "#e11d48",
};
