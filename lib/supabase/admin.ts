import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// 서비스 롤 키 전용 클라이언트. RLS를 우회하므로 절대 클라이언트로 노출하지 말 것.
// app/api/** Route Handler 내부에서만 import 합니다.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
