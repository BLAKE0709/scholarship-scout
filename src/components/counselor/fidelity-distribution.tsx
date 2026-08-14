"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface FidelityBucket {
  bucket: string;
  count: number;
  color: string;
}

interface FidelityDistributionProps {
  data: FidelityBucket[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: FidelityBucket }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border-light bg-surface px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-text-primary">
        Score: {item.payload.bucket}
      </p>
      <p className="text-sm font-mono font-bold text-text-primary">
        {item.value} student{item.value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function FidelityDistribution({ data }: FidelityDistributionProps) {
  const isEmpty = data.every((d) => d.count === 0);

  if (isEmpty) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-text-secondary">
          No fidelity scores recorded yet
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: "var(--color-text-secondary, #6b7280)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--color-text-secondary, #6b7280)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
