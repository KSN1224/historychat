"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { BLOOM_LEVELS, BLOOM_LEVEL_HEX } from "@/lib/bloomLevels";
import type { Room } from "@/lib/roomCode";
import type { ChatAnalysisResult, WorksheetAnalysisResult } from "@/lib/csv";

const FALLBACK_COLOR = "#8a7a5c";

type StudentSubmission = {
  id: number;
  room_id: number;
  analysis_result: ChatAnalysisResult | WorksheetAnalysisResult | null;
};

type SessionSummary = {
  session_number: number;
  hasRoom: boolean;
  totalQuestions: number;
  levelCounts: Record<string, number>;
  feedbacks: string[];
  worksheetCount: number;
};

export function GrowthReportView({
  rooms,
  teacherId,
}: {
  rooms: Room[];
  teacherId: string;
}) {
  const [studentNumber, setStudentNumber] = useState("");
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const { showToast, toastNode } = useToast();

  const isValidStudentNumber = /^\d{2}$/.test(studentNumber);
  const roomsBySessionOrder = useMemo(
    () => [...rooms].sort((a, b) => a.session_number - b.session_number),
    [rooms]
  );

  useEffect(() => {
    if (!isValidStudentNumber) {
      setSubmissions([]);
      setNote("");
      setNoteLoaded(false);
      return;
    }

    const supabase = createClient();
    let active = true;
    setLoading(true);

    async function load() {
      const roomIds = rooms.map((r) => r.id);
      const [{ data: studentRows }, { data: noteRow }] = await Promise.all([
        roomIds.length > 0
          ? supabase
              .from("students")
              .select("id, room_id, analysis_result")
              .in("room_id", roomIds)
              .eq("student_number", studentNumber)
          : Promise.resolve({ data: [] as StudentSubmission[] }),
        supabase
          .from("student_notes")
          .select("note")
          .eq("student_number", studentNumber)
          .maybeSingle(),
      ]);

      if (active) {
        setSubmissions((studentRows as StudentSubmission[]) ?? []);
        setNote(noteRow?.note ?? "");
        setNoteLoaded(true);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [studentNumber, isValidStudentNumber, rooms]);

  const sessionSummaries: SessionSummary[] = roomsBySessionOrder.map(
    (room) => {
      const rowsForRoom = submissions.filter((s) => s.room_id === room.id);
      const levelCounts: Record<string, number> = {};
      const feedbacks: string[] = [];
      let totalQuestions = 0;
      let worksheetCount = 0;

      for (const row of rowsForRoom) {
        const analysis = row.analysis_result;
        if (!analysis) continue;
        if (analysis.type === "worksheet") {
          worksheetCount += 1;
          continue;
        }
        for (const q of analysis.questions ?? []) {
          const level = q.bloomLevel ?? q.questionType ?? "기타";
          levelCounts[level] = (levelCounts[level] ?? 0) + 1;
          totalQuestions += 1;
        }
        if (analysis.teacherFeedback) feedbacks.push(analysis.teacherFeedback);
      }

      return {
        session_number: room.session_number,
        hasRoom: true,
        totalQuestions,
        levelCounts,
        feedbacks,
        worksheetCount,
      };
    }
  );

  const handleSaveNote = async () => {
    setNoteSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("student_notes").upsert(
        {
          teacher_id: teacherId,
          student_number: studentNumber,
          note,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "teacher_id,student_number" }
      );
      showToast(error ? "저장에 실패했습니다." : "메모가 저장되었습니다.");
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <span className="text-xs tracking-[0.3em] text-seal">歷史探究</span>
          <h1 className="font-serif-kr mt-1 text-2xl font-bold text-ink">
            성장 리포트
          </h1>
        </div>
        <Link
          href="/"
          className="text-sm text-ink-soft underline decoration-hanji-line hover:text-seal"
        >
          대시보드로
        </Link>
      </div>

      {/* 인쇄/PDF 저장 시에는 입력창 대신 학생 번호를 텍스트로 보여줍니다. */}
      <div className="mb-4 hidden print:block">
        <span className="text-xs tracking-[0.3em] text-seal">歷史探究</span>
        <h1 className="font-serif-kr mt-1 text-2xl font-bold text-ink">
          성장 리포트 · 개인번호 {studentNumber}
        </h1>
      </div>

      <div className="mb-6 flex items-end gap-3 print:hidden">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">
            개인번호 (2자리)
          </label>
          <input
            value={studentNumber}
            onChange={(e) =>
              setStudentNumber(e.target.value.replace(/\D/g, "").slice(0, 2))
            }
            inputMode="numeric"
            placeholder="01"
            className="w-28 rounded-md border border-hanji-line bg-hanji px-3 py-2 text-lg tracking-widest text-ink focus:border-seal focus:outline-none"
          />
        </div>
        {isValidStudentNumber && (
          <button
            onClick={() => window.print()}
            className="rounded-md border border-hanji-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-hanji-soft"
          >
            인쇄 / PDF로 저장
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-xs text-ink-soft [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
        {BLOOM_LEVELS.map((level) => (
          <span key={level} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: BLOOM_LEVEL_HEX[level] }}
            />
            {level}
          </span>
        ))}
      </div>

      {!isValidStudentNumber ? (
        <p className="text-sm text-ink-soft">
          개인번호를 입력하면 1~7차시에 걸친 질문 변화를 보여드려요.
        </p>
      ) : loading ? (
        <p className="text-sm text-ink-soft">불러오는 중...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sessionSummaries.length === 0 ? (
            <p className="text-sm text-ink-soft">
              아직 만들어진 차시가 없습니다.
            </p>
          ) : (
            sessionSummaries.map((s) => (
              <div
                key={s.session_number}
                className="break-inside-avoid rounded-xl border border-hanji-line bg-hanji p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-serif-kr font-semibold text-ink">
                    {s.session_number}차시
                  </p>
                  <p className="text-xs text-ink-soft">
                    질문 {s.totalQuestions}개
                    {s.worksheetCount > 0 &&
                      ` · 학습지 제출 ${s.worksheetCount}건`}
                  </p>
                </div>

                {s.totalQuestions > 0 ? (
                  <div className="flex h-6 w-full overflow-hidden rounded-full border border-hanji-line [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
                    {(BLOOM_LEVELS as readonly string[])
                      .concat(
                        Object.keys(s.levelCounts).filter(
                          (l) =>
                            !(BLOOM_LEVELS as readonly string[]).includes(l)
                        )
                      )
                      .filter((level) => s.levelCounts[level] > 0)
                      .map((level) => {
                        const pct =
                          (s.levelCounts[level] / s.totalQuestions) * 100;
                        return (
                          <div
                            key={level}
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                BLOOM_LEVEL_HEX[level] ?? FALLBACK_COLOR,
                            }}
                            title={`${level} ${Math.round(pct)}%`}
                          />
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-xs text-ink-soft">
                    {s.worksheetCount > 0
                      ? "학습지 제출만 있습니다."
                      : "제출 기록이 없습니다."}
                  </p>
                )}

                {s.feedbacks.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                    {s.feedbacks.map((f, i) => (
                      <li key={i}>· {f}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}

          <div className="break-inside-avoid rounded-xl border border-hanji-line bg-hanji p-4 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-ink">
              교사의 추가 멘트
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              disabled={!noteLoaded}
              placeholder="이 학생의 성장에 대해 남기고 싶은 메모를 적어주세요."
              className="w-full resize-none rounded-md border border-hanji-line bg-hanji px-3 py-2 text-ink focus:border-seal focus:outline-none disabled:opacity-50 print:hidden"
            />
            <p className="hidden whitespace-pre-wrap text-ink print:block">
              {note || "(작성된 메모 없음)"}
            </p>
            <button
              onClick={handleSaveNote}
              disabled={noteSaving || !noteLoaded}
              className="mt-2 rounded-md bg-seal px-4 py-2 text-sm font-medium text-hanji transition hover:bg-seal-dark disabled:opacity-50 print:hidden"
            >
              {noteSaving ? "저장 중..." : "메모 저장"}
            </button>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}
