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
    <div className="border-b border-hanji-line bg-hanji px-6 py-4">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {roomCode && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-seal text-seal">
              <span className="font-serif-kr text-base font-bold tracking-tight">
                {roomCode}
              </span>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-soft">
              historychat 교사 대시보드
            </p>
            {roomCode ? (
              <p className="font-serif-kr mt-1 text-xl font-bold tracking-wide text-ink">
                방번호 {roomCode}
              </p>
            ) : (
              <p className="mt-1 text-lg text-ink-soft">
                아직 교실이 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopyLink}
            className="rounded-md bg-seal px-4 py-2 text-sm font-medium text-hanji transition hover:bg-seal-dark"
          >
            학생용 링크 복사하기
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={creating}
            className="rounded-md border border-hanji-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-hanji-soft disabled:opacity-50"
          >
            {roomCode ? "새 방 코드 발급" : "내 교실 생성"}
          </button>
          {roomCode && (
            <button
              onClick={handleReset}
              disabled={resetting}
              className="rounded-md border border-seal/40 px-4 py-2 text-sm font-medium text-seal transition hover:bg-seal/10 disabled:opacity-50"
            >
              데이터 전체 초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
