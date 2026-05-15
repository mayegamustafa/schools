'use client';

interface DataPoint {
  month: string;
  [key: string]: string | number;
}

interface Series {
  key: string;
  label: string;
  color: string;
}

interface LineChartProps {
  data: DataPoint[];
  series: Series[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatValue?: (v: number) => string;
}

export default function LineChart({
  data,
  series,
  height = 200,
  showGrid = true,
  showLegend = true,
  formatValue,
}: LineChartProps) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-text-muted text-sm">No data</div>;

  const padding = { top: 16, right: 16, bottom: 32, left: 48 };
  const width = 600;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap(s => data.map(d => Number(d[s.key] ?? 0)));
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const xStep = innerW / Math.max(data.length - 1, 1);
  const toX = (i: number) => padding.left + i * xStep;
  const toY = (v: number) => padding.top + innerH - ((v - minVal) / range) * innerH;

  const gridLines = 4;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = padding.top + (i / gridLines) * innerH;
            const val = maxVal - (i / gridLines) * range;
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
                <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.45}>
                  {formatValue ? formatValue(val) : Math.round(val)}
                </text>
              </g>
            );
          })}

        {data.map((d, i) => (
          <text key={i} x={toX(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.45}>
            {d.month}
          </text>
        ))}

        {series.map(s => {
          const points = data.map((d, i) => `${toX(i)},${toY(Number(d[s.key] ?? 0))}`).join(' ');
          const fillPoints = [
            `${toX(0)},${padding.top + innerH}`,
            ...data.map((d, i) => `${toX(i)},${toY(Number(d[s.key] ?? 0))}`),
            `${toX(data.length - 1)},${padding.top + innerH}`,
          ].join(' ');

          return (
            <g key={s.key}>
              <polygon points={fillPoints} fill={s.color} fillOpacity={0.08} />
              <polyline points={points} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {data.map((d, i) => (
                <circle key={i} cx={toX(i)} cy={toY(Number(d[s.key] ?? 0))} r={3} fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>

      {showLegend && series.length > 1 && (
        <div className="flex flex-wrap gap-4 mt-2 px-1">
          {series.map(s => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
