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
-- 3. rooms: 교사 1명당 최대 7개 차시(session)의 방. 차시별로 방번호가 다름.
-- ============================================================
create table if not exists public.rooms (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  session_number smallint not null check (session_number between 1 and 7),
  room_code text not null unique,
  created_at timestamptz not null default now(),
  unique (teacher_id, session_number)
);

create index if not exists rooms_teacher_id_idx on public.rooms (teacher_id);

alter table public.rooms enable row level security;

drop policy if exists "rooms_select_owner" on public.rooms;
create policy "rooms_select_owner"
  on public.rooms for select
  to authenticated
  using (teacher_id = auth.uid());

-- insert/delete는 방번호 전역 유일성 체크가 필요해 서버(service_role)에서만 수행합니다.

-- ============================================================
-- 4. students: 학생 제출 데이터. 번호 기반 식별만 가능 (PII 없음)
-- ============================================================
create table if not exists public.students (
  id bigint generated always as identity primary key,
  room_id bigint references public.rooms (id) on delete cascade,
  room_code text not null,
  student_number text not null,
  question text not null,
  analysis_result jsonb,
  created_at timestamptz not null default now()
);

-- 기존(마이그레이션 전) students 테이블에 room_id가 없을 수 있으므로 별도 보강
alter table public.students
  add column if not exists room_id bigint references public.rooms (id) on delete cascade;

create index if not exists students_room_code_created_at_idx
  on public.students (room_code, created_at);

create index if not exists students_room_id_created_at_idx
  on public.students (room_id, created_at);

alter table public.students enable row level security;

-- 오직 해당 room_id를 소유한 로그인 교사만 조회/삭제 가능.
-- (대시보드 조회, Realtime 구독, CSV 내보내기, 초기화 버튼에 모두 적용)
drop policy if exists "students_select_owner" on public.students;
create policy "students_select_owner"
  on public.students for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = students.room_id
        and r.teacher_id = auth.uid()
    )
  );

drop policy if exists "students_delete_owner" on public.students;
create policy "students_delete_owner"
  on public.students for delete
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = students.room_id
        and r.teacher_id = auth.uid()
    )
  );

-- 의도적으로 insert/update 정책을 anon/authenticated에 부여하지 않습니다.
-- 학생 제출 및 AI 분석 결과 기록은 서버(Route Handler)가
-- service_role 키로만 수행하여 RLS를 우회합니다. 즉, 학생 브라우저는
-- Supabase에 직접 쓰기를 할 수 없고 반드시 /api/submit 을 거칩니다.

-- ============================================================
-- 4-1. 마이그레이션: 차시(rooms) 도입 이전 데이터 이전.
-- teachers.room_code가 있던 교사는 그 방을 1차시로 옮기고,
-- 그 방번호로 제출된 학생 기록의 room_id를 채워줍니다.
-- 이미 이전된 경우 아무 일도 하지 않아 여러 번 실행해도 안전합니다.
-- ============================================================
insert into public.rooms (teacher_id, session_number, room_code)
select t.id, 1, t.room_code
from public.teachers t
where t.room_code is not null
  and not exists (
    select 1 from public.rooms r where r.room_code = t.room_code
  )
on conflict do nothing;

update public.students s
set room_id = r.id
from public.rooms r
where s.room_id is null
  and s.room_code = r.room_code;

-- ============================================================
-- 5. student_notes: 성장 리포트 화면에서 교사가 학생별로 남기는 메모.
-- 차시와 무관하게 학생 1명당 1개(테이블은 upsert로 갱신).
-- ============================================================
create table if not exists public.student_notes (
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  student_number text not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (teacher_id, student_number)
);

alter table public.student_notes enable row level security;

drop policy if exists "student_notes_owner" on public.student_notes;
create policy "student_notes_owner"
  on public.student_notes for all
  to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ============================================================
-- 6. Realtime 구독 활성화 (교사 대시보드 실시간 조회용)
-- 이미 등록되어 있으면 건너뜁니다 (파일 전체를 여러 번 재실행해도 안전하도록).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'students'
  ) then
    alter publication supabase_realtime add table public.students;
  end if;
end $$;
