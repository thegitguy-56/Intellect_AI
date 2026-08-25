export function NoveltyRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const value = score ?? 0;
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg className="block" style={{ width: size, height: size }} viewBox="0 0 36 36">
      <path
        className="text-surface-container-high"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.8"
      />
      <path
        className="text-secondary-container"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * circumference}, ${circumference}`}
      />
      <text
        x="18"
        y="20.35"
        textAnchor="middle"
        className="fill-secondary-container font-mono text-[8px] font-bold"
      >
        {score != null ? `${Math.round(score)}%` : "—"}
      </text>
    </svg>
  );
}
