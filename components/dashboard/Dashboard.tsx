"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoomHeader } from "./RoomHeader";
import { StudentsTable } from "./StudentsTable";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/roomCode";

export function Dashboard({
  initialRooms,
  email,
}: {
  initialRooms: Room[];
  email: string;
}) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [selectedSession, setSelectedSession] = useState(
    initialRooms.length > 0
      ? Math.max(...initialRooms.map((r) => r.session_number))
      : 1
  );
  const { showToast, toastNode } = useToast();
  const router = useRouter();

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.session_number === selectedSession) ?? null,
    [rooms, selectedSession]
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <>
      <RoomHeader
        rooms={rooms}
        onRoomsChange={setRooms}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSession}
        showToast={showToast}
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-ink-soft">{email}로 로그인됨</p>
          <div className="flex items-center gap-4">
            <Link
              href="/report"
              className="text-sm text-ink-soft underline decoration-hanji-line hover:text-seal"
            >
              성장 리포트 보기
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-ink-soft underline decoration-hanji-line hover:text-seal"
            >
              로그아웃
            </button>
          </div>
        </div>
        {selectedRoom ? (
          <StudentsTable roomId={selectedRoom.id} />
        ) : (
          <div className="rounded-xl border border-dashed border-hanji-line bg-hanji-soft/60 p-10 text-center text-ink-soft">
            상단에서 {selectedSession}차시 방을 만들어주세요.
          </div>
        )}
      </div>
      {toastNode}
    </>
  );
}
