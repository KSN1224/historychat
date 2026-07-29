"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadStudentsCsv, type StudentRow } from "@/lib/csv";

export function StudentsTable({ roomCode }: { roomCode: string }) {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("students")
        .select("id, student_number, question, analysis_result, created_at")
        .eq("room_code", roomCode)
        .order("created_at", { ascending: false });

      if (active) {
        setRows((data as StudentRow[]) ?? []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`students-room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students",
          filter: `room_code=eq.${roomCode}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  const totalQuestions = rows.reduce(
    (sum, row) => sum + (row.analysis_result?.questions?.length ?? 1),
    0
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-800">
          제출 {rows.length}건 · 질문 {totalQuestions}개
        </h2>
        <button
          onClick={() => downloadStudentsCsv(rows, roomCode)}
          disabled={rows.length === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          CSV 다운로드
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">번호</th>
              <th className="px-4 py-2 font-medium">질문별 분석</th>
              <th className="px-4 py-2 font-medium">교사 피드백</th>
              <th className="px-4 py-2 font-medium">추천 심화 질문</th>
              <th className="px-4 py-2 font-medium">시각</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  아직 제출된 질문이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const analysis = row.analysis_result;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 align-top"
                  >
                    <td className="px-4 py-3 font-mono">
                      {row.student_number}
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      {analysis?.questions?.length ? (
                        <ol className="list-decimal space-y-2 pl-4">
                          {analysis.questions.map((q, i) => (
                            <li key={i}>
                              <p>{q.question}</p>
                              <p className="text-xs text-slate-400">
                                {q.questionType} · 사고력 {q.thinkingScore}점
                              </p>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="whitespace-pre-wrap text-slate-400">
                          {row.question}
                        </p>
                      )}
                      <details className="mt-2 text-xs text-slate-400">
                        <summary className="cursor-pointer select-none">
                          원문 보기
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap">
                          {row.question}
                        </p>
                      </details>
                    </td>
                    <td className="px-4 py-3 max-w-xs text-slate-600">
                      {analysis?.teacherFeedback ?? "-"}
                    </td>
                    <td className="px-4 py-3 max-w-xs text-slate-500">
                      {analysis?.followUpQuestions?.length
                        ? analysis.followUpQuestions.map((q, i) => (
                            <div key={i}>· {q}</div>
                          ))
                        : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">
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
