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
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="relative rounded-2xl border border-hanji-line bg-hanji-soft/70 px-10 py-12 shadow-[0_2px_0_0_rgba(42,33,23,0.08)]">
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-seal/40 bg-hanji px-3 py-1 text-[11px] tracking-[0.3em] text-seal">
            歷史
          </span>
          <h1 className="font-serif-kr text-4xl font-bold tracking-wide text-ink">
            historychat
          </h1>
          <div className="mx-auto mt-3 h-px w-16 bg-gradient-to-r from-transparent via-seal/60 to-transparent" />
          <p className="mt-4 text-sm text-ink-soft">
            초등 역사 수업 실시간 질문 · AI 분석 플랫폼
          </p>
          <div className="mt-8 flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </main>
    );
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("room_code, email")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex flex-1 flex-col">
      <Dashboard
        initialRoomCode={teacher?.room_code ?? null}
        email={teacher?.email ?? user.email ?? ""}
      />
    </main>
  );
}
