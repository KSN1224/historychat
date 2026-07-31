"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadStudentsCsv, type StudentRow } from "@/lib/csv";
import { EditableAnalysis } from "./EditableAnalysis";

export function StudentsTable({ roomId }: { roomId: number }) {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("students")
        .select("id, student_number, question, analysis_result, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

      if (active) {
        setRows((data as StudentRow[]) ?? []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`students-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students",
          filter: `room_id=eq.${roomId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 교사가 특정 질문(또는 학습지)의 블룸 단계/사고력 점수를 수정 저장했을 때
  // 서버 왕복(realtime) 없이 즉시 화면에 반영하기 위한 낙관적 업데이트.
  const updateAnalysis = (
    rowId: number,
    questionIndex: number | null,
    bloomLevel: string,
    thinkingScore: number
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId || !row.analysis_result) return row;
        const analysis = row.analysis_result;
        if (analysis.type === "worksheet") {
          return {
            ...row,
            analysis_result: {
              ...analysis,
              bloomLevel,
              thinkingScore,
              editedByTeacher: true,
            },
          };
        }
        if (questionIndex === null || !analysis.questions) return row;
        const questions = [...analysis.questions];
        questions[questionIndex] = {
          ...questions[questionIndex],
          bloomLevel,
          thinkingScore,
          editedByTeacher: true,
        };
        return { ...row, analysis_result: { ...analysis, questions } };
      })
    );
  };

  const totalQuestions = rows.reduce((sum, row) => {
    const analysis = row.analysis_result;
    if (analysis?.type === "worksheet") return sum + 1;
    return sum + (analysis?.questions?.length ?? 1);
  }, 0);

  return (
    <div className="rounded-xl border border-hanji-line bg-hanji shadow-sm">
      <div className="flex items-center justify-between border-b border-hanji-line px-5 py-4">
        <h2 className="font-serif-kr font-semibold text-ink">
          제출 {rows.length}건 · 질문 {totalQuestions}개
        </h2>
        <button
          onClick={() => downloadStudentsCsv(rows, String(roomId))}
          disabled={rows.length === 0}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-hanji transition hover:brightness-95 disabled:opacity-40"
        >
          CSV 다운로드
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink text-hanji-soft">
            <tr>
              <th className="px-4 py-2 font-medium">번호</th>
              <th className="px-4 py-2 font-medium">질문별 분석 (블룸 단계)</th>
              <th className="px-4 py-2 font-medium">학생 질문 총평</th>
              <th className="px-4 py-2 font-medium">교사의 피드백 추천</th>
              <th className="px-4 py-2 font-medium">시각</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                  불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                  아직 제출된 질문이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const analysis = row.analysis_result;
                const isWorksheet = analysis?.type === "worksheet";
                return (
                  <tr
                    key={row.id}
                    className="border-t border-hanji-line align-top odd:bg-hanji-soft/40"
                  >
                    <td className="px-4 py-3 font-mono text-ink">
                      {row.student_number}
                    </td>
                    <td className="px-4 py-3 max-w-sm text-ink">
                      {isWorksheet ? (
                        <div>
                          <span className="mb-1 inline-block rounded-full bg-indigo/10 px-2 py-0.5 text-xs font-medium text-indigo">
                            학습지 · {analysis.correctness}
                          </span>
                          <p className="whitespace-pre-wrap">
                            {analysis.extractedAnswer}
                          </p>
                          <p className="mt-1 text-xs text-ink-soft">
                            <EditableAnalysis
                              studentId={row.id}
                              questionIndex={null}
                              bloomLevel={analysis.bloomLevel}
                              thinkingScore={analysis.thinkingScore}
                              editedByTeacher={analysis.editedByTeacher}
                              onSaved={(level, score) =>
                                updateAnalysis(row.id, null, level, score)
                              }
                            />
                          </p>
                        </div>
                      ) : analysis?.questions?.length ? (
                        <ol className="list-decimal space-y-2 pl-4">
                          {analysis.questions.map((q, i) => (
                            <li key={i}>
                              <p>{q.question}</p>
                              <p className="mt-1 text-xs text-ink-soft">
                                <EditableAnalysis
                                  studentId={row.id}
                                  questionIndex={i}
                                  bloomLevel={q.bloomLevel ?? q.questionType}
                                  thinkingScore={q.thinkingScore}
                                  editedByTeacher={q.editedByTeacher}
                                  onSaved={(level, score) =>
                                    updateAnalysis(row.id, i, level, score)
                                  }
                                />
                              </p>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="whitespace-pre-wrap text-ink-soft">
                          {row.question}
                        </p>
                      )}
                      <details className="mt-2 text-xs text-ink-soft">
                        <summary className="cursor-pointer select-none">
                          원문 보기
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap">
                          {row.question}
                        </p>
                      </details>
                    </td>
                    <td className="px-4 py-3 max-w-xs text-ink-soft">
                      {isWorksheet
                        ? analysis.feedback
                        : analysis?.teacherFeedback ?? "-"}
                    </td>
                    <td className="px-4 py-3 max-w-xs text-ink-soft">
                      {(() => {
                        if (isWorksheet) return "-";
                        const comments =
                          analysis?.guidingComments ??
                          analysis?.followUpQuestions;
                        return comments?.length
                          ? comments.map((c, i) => <div key={i}>· {c}</div>)
                          : "-";
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                      {new Date(row.created_at).toLocaleTimeString("ko-KR")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
