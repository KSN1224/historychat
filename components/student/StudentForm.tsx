"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type RoomStatus = "idle" | "checking" | "valid" | "invalid";

export function StudentForm() {
  const [roomCode, setRoomCode] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [question, setQuestion] = useState("");
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { showToast, toastNode } = useToast();

  useEffect(() => {
    if (roomCode.length !== 4) {
      setRoomStatus("idle");
      return;
    }

    setRoomStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/validate-room?code=${roomCode}`);
        const data = await res.json();
        setRoomStatus(data.valid ? "valid" : "invalid");
      } catch {
        setRoomStatus("invalid");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [roomCode]);

  const canSubmit =
    roomStatus === "valid" &&
    /^\d{2}$/.test(studentNumber) &&
    question.trim().length > 0 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, studentNumber, question }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("전송 완료");
        setQuestion("");
      } else {
        setErrorMsg(data.error ?? "제출 중 오류가 발생했습니다.");
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          방번호 (4자리)
        </label>
        <input
          value={roomCode}
          onChange={(e) =>
            setRoomCode(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          inputMode="numeric"
          placeholder="0000"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-lg tracking-widest focus:border-blue-500 focus:outline-none"
        />
        {roomCode.length === 4 && (
          <p
            className={`mt-1 text-xs ${
              roomStatus === "valid"
                ? "text-emerald-600"
                : roomStatus === "invalid"
                ? "text-red-500"
                : "text-slate-400"
            }`}
          >
            {roomStatus === "checking" && "확인 중..."}
            {roomStatus === "valid" && "유효한 방번호입니다."}
            {roomStatus === "invalid" && "존재하지 않는 방번호입니다."}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          개인번호 (2자리)
        </label>
        <input
          value={studentNumber}
          onChange={(e) =>
            setStudentNumber(e.target.value.replace(/\D/g, "").slice(0, 2))
          }
          inputMode="numeric"
          placeholder="01"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-lg tracking-widest focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          질문
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={3000}
          rows={8}
          placeholder="궁금한 점을 적거나, 역사 인물 챗봇과 나눈 대화 전체를 그대로 붙여넣어도 됩니다."
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-40"
      >
        {submitting ? "전송 중..." : "제출하기"}
      </button>

      {toastNode}
    </form>
  );
}
