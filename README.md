# historychat

초등학교 역사 수업용 실시간 질문 · AI 분석 플랫폼.

- `/` : 교사 대시보드 (구글 로그인, 방 코드 생성, 실시간 질문 조회, CSV 다운로드, 데이터 초기화)
- `/student` : 학생 질문 제출 페이지 (이름/생년월일 등 개인정보 입력 없음, 방번호+개인번호만 사용)

## 기술 스택

Next.js 16(App Router) · Tailwind CSS v4 · Supabase(Auth/Postgres/Realtime) · Google Gemini API

## 1. 로컬 개발 환경 준비

### 1-1. 의존성 설치

```bash
npm install
```

### 1-2. Supabase 프로젝트 생성 및 스키마 적용

1. [supabase.com](https://supabase.com) 에서 새 프로젝트를 생성합니다.
2. 프로젝트의 **SQL Editor**를 열고 `supabase/schema.sql` 파일 내용 전체를 붙여넣어 실행합니다.
   - `teachers`, `students` 테이블과 RLS 정책, 자동 트리거가 한 번에 생성됩니다.
3. **Authentication > Providers > Google**에서 구글 로그인을 활성화합니다.
   - Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 생성합니다.
   - Supabase가 안내하는 콜백 URL(`https://<project-ref>.supabase.co/auth/v1/callback`)을 Google Cloud Console의 "승인된 리디렉션 URI"에 등록합니다.
   - 발급받은 Client ID / Client Secret을 Supabase Google Provider 설정에 입력하고 저장합니다.
4. **Project Settings > API**에서 아래 값을 확인합니다.
   - Project URL
   - `anon` `public` key
   - `service_role` key (절대 외부에 노출하지 마세요)

### 1-3. Gemini API 키 발급

[Google AI Studio](https://aistudio.google.com)에서 API 키를 발급받습니다.

### 1-4. 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 위에서 발급받은 값을 채워 넣습니다.

```bash
cp .env.local.example .env.local
```

### 1-5. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 에서 교사 대시보드를, `http://localhost:3000/student` 에서 학생 페이지를 확인할 수 있습니다.

> Google OAuth 리디렉션은 로컬 개발 시 `http://localhost:3000/auth/callback` 으로 자동 설정됩니다. Supabase Authentication > URL Configuration의 Redirect URLs에 `http://localhost:3000/**` 을 추가해두면 로컬 테스트가 원활합니다.

## 2. Vercel 배포

1. GitHub 저장소를 생성하고 이 프로젝트를 push 합니다.
2. [Vercel](https://vercel.com)에서 해당 저장소를 새 프로젝트로 Import 합니다.
3. Vercel 프로젝트 **Settings > Environment Variables**에 `.env.local`과 동일한 4개 값을 등록합니다.
4. Supabase Authentication > URL Configuration의 Redirect URLs에 `https://historychat.vercel.app/**` 을 추가합니다.
5. Deploy 하면 `https://historychat.vercel.app` 에서 서비스가 동작합니다.

## 3. 개인정보 보호 설계 요약

- 학생 식별은 방번호(4자리)+개인번호(2자리)만 사용하며 이름·생년월일 등 PII는 애초에 입력받지 않습니다(DB 스키마에 해당 컬럼 없음).
- 학생 브라우저는 Supabase에 직접 쓰기를 하지 않고, 반드시 서버의 `/api/submit`을 통해서만 데이터가 기록됩니다(서비스 롤 키는 서버에만 존재).
- RLS로 인해 각 교사는 자신의 방번호와 일치하는 학생 데이터만 조회/삭제할 수 있습니다.
- 대시보드의 "데이터 전체 초기화" 버튼으로 수업 종료 후 즉시 학생 데이터를 폐기할 수 있습니다.
- Gemini 시스템 프롬프트에 "학생의 실명이 포함되어 있을 경우 이를 무시" 지침을 명시했습니다.

## 4. 프로젝트 구조

```
app/
  page.tsx                 # "/" 교사 대시보드
  student/page.tsx         # "/student" 학생 제출 페이지
  auth/callback/route.ts   # 구글 OAuth 콜백
  api/
    room/create/route.ts   # 방 코드 생성
    room/reset/route.ts    # 데이터 초기화
    validate-room/route.ts # 방번호 실시간 검증
    submit/route.ts        # 학생 제출 + Gemini 분석
components/
  dashboard/                # 교사 대시보드 UI
  student/                  # 학생 폼 UI
  ui/Toast.tsx
lib/
  supabase/{client,server,admin}.ts
  gemini.ts                 # Gemini 연동 및 시스템 프롬프트
  roomCode.ts
  csv.ts
proxy.ts                    # Next.js 16의 미들웨어(세션 갱신)
supabase/schema.sql          # DB 스키마 + RLS 정책
```
