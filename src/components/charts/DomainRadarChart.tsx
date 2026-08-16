import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

export function DomainRadarChart({ data }: { data: { domain: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <Radar
          dataKey="score"
          stroke="var(--primary)"
          fill="var(--primary)"
          fillOpacity={0.22}
          isAnimationActive={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}