import { StudentForm } from "@/components/student/StudentForm";

export default function StudentPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-xs tracking-[0.3em] text-seal">歷史探究</span>
          <h1 className="font-serif-kr mt-1 text-2xl font-bold text-ink">
            역사 질문하기
          </h1>
          <div className="mx-auto mt-3 h-px w-14 bg-gradient-to-r from-transparent via-seal/60 to-transparent" />
          <p className="mt-3 text-sm text-ink-soft">
            선생님이 알려준 방번호와 내 번호를 입력해주세요.
          </p>
        </div>
        <StudentForm />
      </div>
    </main>
  );
}
