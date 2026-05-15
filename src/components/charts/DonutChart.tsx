'use client';

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
  formatValue?: (v: number) => string;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default function DonutChart({
  data,
  size = 160,
  thickness = 32,
  centerLabel,
  centerValue,
  showLegend = true,
  formatValue,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div className="flex items-center justify-center h-40 text-text-muted text-sm">No data</div>;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - thickness / 2 - 4;

  const slices = data.reduce<Array<DonutSlice & { start: number; sweep: number }>>((acc, d) => {
    const previous = acc[acc.length - 1];
    const start = previous ? previous.start + previous.sweep : 0;
    const sweep = (d.value / total) * 360;
    return [...acc, { ...d, start, sweep }];
  }, []);

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity={0.07} strokeWidth={thickness} />
        {slices.map((s, i) => (
          <path
            key={i}
            d={describeArc(cx, cy, r, s.start, s.start + s.sweep - 0.5)}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeLinecap="round"
          />
        ))}
        {centerValue && (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight={600} fill="currentColor">{centerValue}</text>
            {centerLabel && <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.5}>{centerLabel}</text>}
          </>
        )}
      </svg>

      {showLegend && (
        <div className="flex flex-col gap-2 min-w-0">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-text-secondary truncate">{s.label}</span>
              <span className="ml-auto pl-3 font-medium text-text-primary flex-shrink-0">
                {formatValue ? formatValue(s.value) : `${Math.round((s.value / total) * 100)}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
