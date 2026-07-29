import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Components / Route Handlers / Server Actions 에서 사용.
// 로그인한 교사의 세션 쿠키를 읽어 RLS(auth.uid())가 적용된 요청을 보냅니다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출된 경우 쿠키를 쓸 수 없으나,
            // proxy.ts가 세션 갱신을 담당하므로 무시해도 안전합니다.
          }
        },
      },
    }
  );
}
