-- historychat DB schema
-- Supabase 프로젝트의 SQL Editor에 이 파일 전체를 붙여넣고 실행하세요.
-- 개인정보 최소화: 학생 이름/생년월일 등 식별정보 컬럼은 존재하지 않습니다.

-- ============================================================
-- 1. teachers: 구글 로그인한 교사 1명당 1행. auth.users와 1:1.
-- ============================================================
create table if not exists public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  room_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teachers enable row level security;

drop policy if exists "teachers_select_own" on public.teachers;
create policy "teachers_select_own"
  on public.teachers for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "teachers_update_own" on public.teachers;
create policy "teachers_update_own"
  on public.teachers for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- insert는 아래 handle_new_user 트리거(SECURITY DEFINER)만 수행하며,
-- 클라이언트에는 insert 정책을 부여하지 않습니다.

-- ============================================================
-- 2. 신규 구글 로그인 시 teachers row 자동 생성 트리거
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teachers (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. students: 학생 제출 데이터. 번호 기반 식별만 가능 (PII 없음)
-- ============================================================
create table if not exists public.students (
  id bigint generated always as identity primary key,
  room_code text not null,
  student_number text not null,
  question text not null,
  analysis_result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists students_room_code_created_at_idx
  on public.students (room_code, created_at);

alter table public.students enable row level security;

-- 오직 해당 room_code를 현재 소유한 로그인 교사만 조회/삭제 가능.
-- (대시보드 조회, Realtime 구독, CSV 내보내기, 초기화 버튼에 모두 적용)
drop policy if exists "students_select_owner" on public.students;
create policy "students_select_owner"
  on public.students for select
  to authenticated
  using (
    exists (
      select 1 from public.teachers t
      where t.room_code = students.room_code
        and t.id = auth.uid()
    )
  );

drop policy if exists "students_delete_owner" on public.students;
create policy "students_delete_owner"
  on public.students for delete
  to authenticated
  using (
    exists (
      select 1 from public.teachers t
      where t.room_code = students.room_code
        and t.id = auth.uid()
    )
  );

-- 의도적으로 insert/update 정책을 anon/authenticated에 부여하지 않습니다.
-- 학생 제출 및 AI 분석 결과 기록은 서버(Route Handler)가
-- service_role 키로만 수행하여 RLS를 우회합니다. 즉, 학생 브라우저는
-- Supabase에 직접 쓰기를 할 수 없고 반드시 /api/submit 을 거칩니다.

-- ============================================================
-- 4. Realtime 구독 활성화 (교사 대시보드 실시간 조회용)
-- ============================================================
alter publication supabase_realtime add table public.students;
