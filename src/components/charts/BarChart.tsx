'use client';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  color?: string;
  showValues?: boolean;
  formatValue?: (v: number) => string;
  horizontal?: boolean;
}

export default function BarChart({
  data,
  height = 200,
  color = 'var(--color-primary)',
  showValues = true,
  formatValue,
  horizontal = false,
}: BarChartProps) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-text-muted text-sm">No data</div>;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const padding = { top: 16, right: 16, bottom: horizontal ? 16 : 36, left: horizontal ? 96 : 40 };
  const svgW = 600;
  const svgH = horizontal ? Math.max(data.length * 36 + padding.top + padding.bottom, height) : height;
  const innerW = svgW - padding.left - padding.right;
  const innerH = svgH - padding.top - padding.bottom;

  if (horizontal) {
    const barH = Math.min(24, (innerH / data.length) * 0.65);
    const gap = innerH / data.length;

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: svgH }}>
        {data.map((d, i) => {
          const barW = (d.value / maxVal) * innerW;
          const y = padding.top + i * gap + (gap - barH) / 2;
          return (
            <g key={i}>
              <text x={padding.left - 8} y={y + barH / 2 + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.55}>
                {d.label}
              </text>
              <rect x={padding.left} y={y} width={innerW} height={barH} rx={4} fill="currentColor" fillOpacity={0.06} />
              <rect x={padding.left} y={y} width={Math.max(barW, 4)} height={barH} rx={4} fill={d.color || color} />
              {showValues && (
                <text x={padding.left + barW + 6} y={y + barH / 2 + 4} fontSize={10} fill="currentColor" opacity={0.55}>
                  {formatValue ? formatValue(d.value) : d.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  const barW = Math.min(48, (innerW / data.length) * 0.6);
  const barGap = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height }}>
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const y = padding.top + (1 - frac) * innerH;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={svgW - padding.right} y2={y} stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} />
            <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.45}>
              {formatValue ? formatValue(frac * maxVal) : Math.round(frac * maxVal)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const barH = (d.value / maxVal) * innerH;
        const x = padding.left + i * barGap + (barGap - barW) / 2;
        const y = padding.top + innerH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 2)} rx={4} fill={d.color || color} />
            <text x={x + barW / 2} y={svgH - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.45}>
              {d.label}
            </text>
            {showValues && barH > 20 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.55}>
                {formatValue ? formatValue(d.value) : d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
