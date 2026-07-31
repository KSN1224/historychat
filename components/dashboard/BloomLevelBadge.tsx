import { BLOOM_LEVEL_BADGE_STYLES } from "@/lib/bloomLevels";

export function BloomLevelBadge({ level }: { level?: string }) {
  if (!level) return null;
  const style = BLOOM_LEVEL_BADGE_STYLES[level] ?? "bg-ink text-hanji";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${style}`}
    >
      {level}
    </span>
  );
}
