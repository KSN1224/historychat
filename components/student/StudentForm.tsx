"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type RoomStatus = "idle" | "checking" | "valid" | "invalid";

// 학습지 사진은 업로드 전 브라우저에서 이 크기로 축소/재압축합니다.
// 휴대폰 카메라 원본(수 MB~수십 MB)이 서버 요청 용량 한도를 넘지 않도록 하기 위함입니다.
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height)
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", IMAGE_JPEG_QUALITY)
  );
  return blob ?? file;
}

export function StudentForm() {
  const [roomCode, setRoomCode] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [question, setQuestion] = useState("");
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [worksheetImage, setWorksheetImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, toastNode } = useToast();

  // 미리보기 URL은 컴포넌트가 사라지거나 이미지가 바뀔 때 반드시 해제합니다.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (roomCode.length !== 4) {
      setRoomStatus("idle");
      return;
    }

    setRoomStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/validate-room?code=${roomCode}`);
        const data = await res.json();
        setRoomStatus(data.valid ? "valid" : "invalid");
      } catch {
        setRoomStatus("invalid");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [roomCode]);

  const canSubmit =
    roomStatus === "valid" &&
    /^\d{2}$/.test(studentNumber) &&
    question.trim().length > 0 &&
    !submitting;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    try {
      const compressed = await compressImage(file);
      setWorksheetImage(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      setErrorMsg("이미지를 처리하지 못했습니다. 다른 사진을 선택해주세요.");
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setWorksheetImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.set("roomCode", roomCode);
      formData.set("studentNumber", studentNumber);
      formData.set("question", question);
      if (worksheetImage) {
        formData.set("worksheetImage", worksheetImage, "worksheet.jpg");
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showToast("전송 완료");
        setQuestion("");
        handleRemoveImage();
      } else {
        setErrorMsg(data.error ?? "제출 중 오류가 발생했습니다.");
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-hanji-line bg-hanji p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          방번호 (4자리)
        </label>
        <input
          value={roomCode}
          onChange={(e) =>
            setRoomCode(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          inputMode="numeric"
          placeholder="0000"
          className="w-full rounded-md border border-hanji-line bg-hanji px-3 py-2 text-lg tracking-widest text-ink focus:border-seal focus:outline-none"
        />
        {roomCode.length === 4 && (
          <p
            className={`mt-1 text-xs ${
              roomStatus === "valid"
                ? "text-indigo"
                : roomStatus === "invalid"
                ? "text-seal"
                : "text-ink-soft"
            }`}
          >
            {roomStatus === "checking" && "확인 중..."}
            {roomStatus === "valid" && "유효한 방번호입니다."}
            {roomStatus === "invalid" && "존재하지 않는 방번호입니다."}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          개인번호 (2자리)
        </label>
        <input
          value={studentNumber}
          onChange={(e) =>
            setStudentNumber(e.target.value.replace(/\D/g, "").slice(0, 2))
          }
          inputMode="numeric"
          placeholder="01"
          className="w-full rounded-md border border-hanji-line bg-hanji px-3 py-2 text-lg tracking-widest text-ink focus:border-seal focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          질문
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={3000}
          rows={8}
          placeholder="궁금한 점을 적거나, 역사 인물 챗봇과 나눈 대화 전체를 그대로 붙여넣어도 됩니다."
          className="w-full resize-none rounded-md border border-hanji-line bg-hanji px-3 py-2 text-ink focus:border-seal focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          학습지 업로드 (선택)
        </label>
        <p className="mb-2 text-xs text-ink-soft">
          손글씨로 작성한 학습지 사진을 올리면 AI가 답변을 읽고 정답 여부와
          피드백을 알려줘요.
        </p>

        {previewUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="학습지 미리보기"
              className="h-24 w-24 rounded-md border border-hanji-line object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="rounded-md border border-hanji-line px-3 py-2 text-sm text-ink-soft transition hover:text-seal"
            >
              사진 제거
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-hanji-line bg-hanji px-3 py-4 text-sm text-ink-soft transition hover:border-seal hover:text-seal">
            학습지 사진 선택
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {errorMsg && <p className="text-sm text-seal">{errorMsg}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-seal px-4 py-3 font-medium text-hanji transition hover:bg-seal-dark disabled:opacity-40"
      >
        {submitting ? "전송 중..." : "제출하기"}
      </button>

      {toastNode}
    </form>
  );
}
