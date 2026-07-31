import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GrowthReportView } from "@/components/dashboard/GrowthReportView";

export default async function ReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, session_number, room_code")
    .order("session_number");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <GrowthReportView rooms={rooms ?? []} teacherId={user.id} />
    </main>
  );
}
