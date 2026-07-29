export function generateRoomCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export function isValidRoomCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export function isValidStudentNumber(num: string): boolean {
  return /^\d{2}$/.test(num);
}
