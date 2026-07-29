import { StudentForm } from "@/components/student/StudentForm";

export default function StudentPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-slate-900">
          역사 질문하기
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          선생님이 알려준 방번호와 내 번호를 입력해주세요.
        </p>
        <StudentForm />
      </div>
    </main>
  );
}
