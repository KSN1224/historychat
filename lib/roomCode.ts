export function generateRoomCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export function isValidRoomCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export function isValidStudentNumber(num: string): boolean {
  return /^\d{2}$/.test(num);
}

// "1"~"9"는 "01"~"09"와 같은 학생으로 취급합니다.
export function normalizeStudentNumber(num: string): string | null {
  if (/^\d{2}$/.test(num)) return num;
  if (/^[1-9]$/.test(num)) return `0${num}`;
  return null;
}

export const MAX_SESSION_NUMBER = 7;

export function isValidSessionNumber(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= MAX_SESSION_NUMBER;
}

export type Room = {
  id: number;
  session_number: number;
  room_code: string;
};
