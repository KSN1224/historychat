"use client";

import { useState } from "react";

const STUDENT_URL = "https://historychatko.vercel.app/student";

export function RoomHeader({
  roomCode,
  onRoomCodeChange,
  showToast,
}: {
  roomCode: string | null;
  onRoomCodeChange: (code: string) => void;
  showToast: (msg: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/room/create", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        onRoomCodeChange(data.roomCode);
        showToast(`새 교실 코드가 발급되었습니다: ${data.roomCode}`);
      } else {
        showToast(data.error ?? "교실 생성에 실패했습니다.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(STUDENT_URL);
    showToast("링크가 복사되었습니다");
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "현재 교실의 모든 학생 데이터를 삭제합니다. 계속하시겠습니까?"
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/room/reset", { method: "POST" });
      const data = await res.json();
      showToast(res.ok ? "데이터가 모두 초기화되었습니다." : data.error);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            historychat 교사 대시보드
          </p>
          {roomCode ? (
            <p className="mt-1 text-2xl font-bold tracking-widest text-slate-900">
              방번호 {roomCode}
            </p>
          ) : (
            <p className="mt-1 text-lg text-slate-500">
              아직 교실이 없습니다.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopyLink}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            학생용 링크 복사하기
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={creating}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {roomCode ? "새 방 코드 발급" : "내 교실 생성"}
          </button>
          {roomCode && (
            <button
              onClick={handleReset}
              disabled={resetting}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              데이터 전체 초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
