"use client";

import { useState } from "react";
import { MAX_SESSION_NUMBER, type Room } from "@/lib/roomCode";

const STUDENT_URL = "https://historychatko.vercel.app/student";

export function RoomHeader({
  rooms,
  onRoomsChange,
  selectedSession,
  onSelectSession,
  showToast,
}: {
  rooms: Room[];
  onRoomsChange: (rooms: Room[]) => void;
  selectedSession: number;
  onSelectSession: (session: number) => void;
  showToast: (msg: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedRoom =
    rooms.find((r) => r.session_number === selectedSession) ?? null;

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNumber: selectedSession }),
      });
      const data = await res.json();
      if (res.ok) {
        onRoomsChange([
          ...rooms.filter((r) => r.session_number !== selectedSession),
          {
            id: data.roomId,
            session_number: data.sessionNumber,
            room_code: data.roomCode,
          },
        ]);
        showToast(`${selectedSession}차시 방이 만들어졌습니다: ${data.roomCode}`);
      } else {
        showToast(data.error ?? "방 생성에 실패했습니다.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!selectedRoom) return;
    await navigator.clipboard.writeText(
      `${STUDENT_URL}\n방번호: ${selectedRoom.room_code} (${selectedSession}차시)`
    );
    showToast("링크와 방번호가 복사되었습니다");
  };

  const handleReset = async () => {
    if (!selectedRoom) return;
    if (
      !window.confirm(
        `${selectedSession}차시의 모든 학생 데이터를 삭제합니다. 계속하시겠습니까?`
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/room/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNumber: selectedSession }),
      });
      const data = await res.json();
      showToast(res.ok ? "데이터가 모두 초기화되었습니다." : data.error);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoom) return;
    if (
      !window.confirm(
        `${selectedSession}차시 방을 완전히 삭제합니다. 학생 제출 기록도 함께 사라지며 되돌릴 수 없습니다. 계속하시겠습니까?`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/room/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNumber: selectedSession }),
      });
      const data = await res.json();
      if (res.ok) {
        onRoomsChange(
          rooms.filter((r) => r.session_number !== selectedSession)
        );
        showToast(`${selectedSession}차시 방이 삭제되었습니다.`);
      } else {
        showToast(data.error ?? "삭제에 실패했습니다.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const sessionNumbers = Array.from(
    { length: MAX_SESSION_NUMBER },
    (_, i) => i + 1
  );

  return (
    <div className="border-b border-hanji-line bg-hanji px-6 py-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-soft">
              historychat 교사 대시보드
            </p>
            <div className="mt-2 flex gap-2">
              {sessionNumbers.map((n) => {
                const hasRoom = rooms.some((r) => r.session_number === n);
                const isSelected = n === selectedSession;
                return (
                  <button
                    key={n}
                    onClick={() => onSelectSession(n)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                      isSelected
                        ? "border-seal bg-seal text-hanji"
                        : hasRoom
                        ? "border-seal/60 text-seal hover:bg-seal/10"
                        : "border-hanji-line text-ink-soft hover:border-seal/40"
                    }`}
                    title={`${n}차시${hasRoom ? "" : " (미생성)"}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRoom && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-seal text-seal">
              <span className="font-serif-kr text-base font-bold tracking-tight">
                {selectedRoom.room_code}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {selectedRoom ? (
            <p className="font-serif-kr text-xl font-bold tracking-wide text-ink">
              {selectedSession}차시 · 방번호 {selectedRoom.room_code}
            </p>
          ) : (
            <p className="text-lg text-ink-soft">
              {selectedSession}차시 방이 아직 없습니다.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {selectedRoom ? (
              <>
                <button
                  onClick={handleCopyLink}
                  className="rounded-md bg-seal px-4 py-2 text-sm font-medium text-hanji transition hover:bg-seal-dark"
                >
                  학생용 링크 복사하기
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="rounded-md border border-hanji-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-hanji-soft disabled:opacity-50"
                >
                  데이터 초기화
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-md border border-seal/40 px-4 py-2 text-sm font-medium text-seal transition hover:bg-seal/10 disabled:opacity-50"
                >
                  이 차시 삭제
                </button>
              </>
            ) : (
              <button
                onClick={handleCreateRoom}
                disabled={creating}
                className="rounded-md border border-hanji-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-hanji-soft disabled:opacity-50"
              >
                {selectedSession}차시 방 만들기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
