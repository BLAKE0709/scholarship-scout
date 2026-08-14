"use client";

function getScoreColor(score: number): string {
  if (score >= 90) return "#22C55E"; // green
  if (score >= 75) return "#1A9988"; // teal
  if (score >= 60) return "#F59E0B"; // amber
  return "#9CA3AF"; // gray
}

export function MatchScore({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = {
    sm: { width: 48, stroke: 3, fontSize: "text-sm", radius: 18 },
    md: { width: 72, stroke: 4, fontSize: "text-xl", radius: 28 },
    lg: { width: 96, stroke: 5, fontSize: "text-2xl", radius: 38 },
  };

  const d = dimensions[size];
  const circumference = 2 * Math.PI * d.radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: d.width, height: d.width }}
    >
      <svg
        width={d.width}
        height={d.width}
        viewBox={`0 0 ${d.width} ${d.width}`}
        className="-rotate-90"
      >
        <circle
          cx={d.width / 2}
          cy={d.width / 2}
          r={d.radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={d.stroke}
        />
        <circle
          cx={d.width / 2}
          cy={d.width / 2}
          r={d.radius}
          fill="none"
          stroke={color}
          strokeWidth={d.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span
        className={`absolute font-mono font-bold ${d.fontSize}`}
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
