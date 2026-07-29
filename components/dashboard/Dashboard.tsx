"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoomHeader } from "./RoomHeader";
import { StudentsTable } from "./StudentsTable";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

export function Dashboard({
  initialRoomCode,
  email,
}: {
  initialRoomCode: string | null;
  email: string;
}) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const { showToast, toastNode } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <>
      <RoomHeader
        roomCode={roomCode}
        onRoomCodeChange={setRoomCode}
        showToast={showToast}
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">{email}로 로그인됨</p>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 underline hover:text-slate-600"
          >
            로그아웃
          </button>
        </div>
        {roomCode ? (
          <StudentsTable roomCode={roomCode} />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
            상단의 &quot;내 교실 생성&quot; 버튼을 눌러 교실을 만들어주세요.
          </div>
        )}
      </div>
      {toastNode}
    </>
  );
}
