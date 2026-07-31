"use client";

import { useState } from "react";
import { BLOOM_LEVELS } from "@/lib/bloomLevels";
import { BloomLevelBadge } from "./BloomLevelBadge";

// 학생 질문(또는 학습지 답변) 하나에 대한 AI의 블룸 단계/사고력 점수 판정을
// 교사가 직접 고쳐서 저장할 수 있게 하는 인라인 편집 UI.
export function EditableAnalysis({
  studentId,
  questionIndex,
  bloomLevel,
  thinkingScore,
  editedByTeacher,
  onSaved,
}: {
  studentId: number;
  // 학습지처럼 질문 배열이 아닌 단일 분석 결과인 경우 null
  questionIndex: number | null;
  bloomLevel?: string;
  thinkingScore?: number;
  editedByTeacher?: boolean;
  onSaved: (bloomLevel: string, thinkingScore: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [level, setLevel] = useState(bloomLevel ?? BLOOM_LEVELS[0]);
  const [score, setScore] = useState(thinkingScore ?? 5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setLevel(bloomLevel ?? BLOOM_LEVELS[0]);
    setScore(thinkingScore ?? 5);
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/analysis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex,
          bloomLevel: level,
          thinkingScore: score,
        }),
      });
      if (!res.ok) {
        setError("저장 실패");
        return;
      }
      onSaved(level, score);
      setEditing(false);
    } catch {
      setError("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <BloomLevelBadge level={bloomLevel} />
        <span>사고력 {thinkingScore ?? "-"}점</span>
        {editedByTeacher && (
          <span className="text-[10px] text-ink-soft">(교사 수정)</span>
        )}
        <button
          type="button"
          onClick={startEditing}
          className="text-[11px] text-ink-soft underline decoration-dotted hover:text-seal"
        >
          수정
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        className="rounded border border-hanji-line bg-hanji px-1 py-0.5 text-xs text-ink"
      >
        {BLOOM_LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        max={10}
        value={score}
        onChange={(e) => setScore(Number(e.target.value))}
        className="w-12 rounded border border-hanji-line bg-hanji px-1 py-0.5 text-xs text-ink"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-medium text-seal underline disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={saving}
        className="text-xs text-ink-soft underline disabled:opacity-50"
      >
        취소
      </button>
      {error && <span className="text-[11px] text-seal">{error}</span>}
    </span>
  );
}
