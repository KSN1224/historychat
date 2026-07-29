import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/dashboard/GoogleSignInButton";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">historychat</h1>
          <p className="mt-2 text-slate-500">
            초등 역사 수업 실시간 질문 · AI 분석 플랫폼
          </p>
        </div>
        <GoogleSignInButton />
      </main>
    );
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("room_code, email")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex flex-1 flex-col bg-slate-50">
      <Dashboard
        initialRoomCode={teacher?.room_code ?? null}
        email={teacher?.email ?? user.email ?? ""}
      />
    </main>
  );
}
