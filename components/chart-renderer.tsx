'use client';

import React from 'react';

export interface VisualizationData {
  type: 'line' | 'bar' | 'pie' | 'kpi' | 'table';
  title: string;
  xKey?: string;
  yKey?: string;
  data: any[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLabel(d: any, xKey: string): string {
  if (!d || typeof d !== 'object') return '';
  if (xKey in d) return String(d[xKey] ?? '');
  const fallbacks = ['labelKey', 'label', 'name', 'category', 'title', 'x'];
  for (const key of fallbacks) {
    if (key in d) return String(d[key] ?? '');
  }
  const values = Object.values(d);
  return values.length > 0 ? String(values[0] ?? '') : '';
}

function getRawValue(d: any, yKey: string): any {
  if (!d || typeof d !== 'object') return 0;
  if (yKey in d) return d[yKey];
  const fallbacks = ['valueKey', 'value', 'amount', 'count', 'y'];
  for (const key of fallbacks) {
    if (key in d) return d[key];
  }
  const values = Object.values(d);
  return values.length > 1 ? values[1] : (values.length > 0 ? values[0] : 0);
}

function getValue(d: any, yKey: string): number {
  const raw = getRawValue(d, yKey);
  const val = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
  return isNaN(val) ? 0 : val;
}

/** Format a Y-axis tick value into a compact readable string */
function formatYTick(val: number): string {
  if (val === 0) return '0';
  if (Math.abs(val) >= 10_000_000) return `${(val / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(val) >= 100_000)   return `${(val / 100_000).toFixed(1)}L`;
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
  return val % 1 === 0 ? val.toString() : val.toFixed(1);
}

/** Truncate a label to a maximum character length */
function truncateLabel(label: string, max: number): string {
  return label.length > max ? label.substring(0, max - 2) + '..' : label;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

export function KPICard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-[#1A2235]/40 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-md flex flex-col justify-center min-w-[160px] w-full">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{title}</span>
      <span className="text-xl font-extrabold text-white mt-1 tracking-tight">{value}</span>
    </div>
  );
}

// ─── Table View ──────────────────────────────────────────────────────────────

export function TableView({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;
  const headers = Object.keys(data[0]);
  return (
    <div className="bg-[#1A2235]/40 backdrop-blur-md border border-white/5 rounded-xl shadow-md overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#111827]/60 border-b border-white/5 text-gray-400 font-bold uppercase tracking-wider">
              {headers.map((h) => (
                <th key={h} className="p-3 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors text-gray-300">
                {headers.map((h) => (
                  <td key={h} className="p-3 font-medium whitespace-nowrap">{String(row[h] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

export function BarChart({ data, xKey, yKey, title }: { data: any[]; xKey: string; yKey: string; title: string }) {
  const labels  = data.map(d => getLabel(d, xKey));
  const values  = data.map(d => getValue(d, yKey));
  const maxVal  = Math.max(...values, 1);

  const barCount    = data.length;
  const manyBars    = barCount > 6;

  // Dynamic sizing: each bar gets at least 45px width in dense charts
  const minBarSlot   = manyBars ? 52 : 70;
  const paddingLeft  = 64;
  const paddingRight = 24;
  const paddingTop   = 30;
  // Extra bottom padding when labels are rotated so they don't clip
  const paddingBottom = manyBars ? 80 : 50;

  const innerWidth  = Math.max(500 - paddingLeft - paddingRight, barCount * minBarSlot);
  const totalWidth  = innerWidth + paddingLeft + paddingRight;
  const height      = manyBars ? 290 : 270;
  const chartHeight = height - paddingTop - paddingBottom;

  const barGap   = manyBars ? 10 : 14;
  const totalGaps = barGap * (barCount - 1);
  const barWidth  = barCount > 0 ? (innerWidth - totalGaps) / barCount : 0;

  // Y-axis: 5 clean ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // Label truncation threshold based on bar width
  const maxLabelLen = manyBars ? 11 : 9;

  // Needs horizontal scroll only when SVG wider than container baseline
  const needsScroll = totalWidth > 500;

  const svg = (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      style={needsScroll ? { width: totalWidth, height, display: 'block' } : undefined}
      className={needsScroll ? '' : 'w-full h-auto'}
      aria-label={title}
    >
      <defs>
        <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="bar-gradient-hover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>

      {/* Y-axis gridlines + tick labels */}
      {yTicks.map((ratio, i) => {
        const yVal = maxVal * ratio;
        const y    = paddingTop + chartHeight * (1 - ratio);
        return (
          <g key={i}>
            <line
              x1={paddingLeft} y1={y}
              x2={totalWidth - paddingRight} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 8} y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#9CA3AF"
              fontFamily="system-ui, sans-serif"
              fontWeight="500"
            >
              {formatYTick(yVal)}
            </text>
          </g>
        );
      })}

      {/* Bars + labels */}
      {data.map((item, i) => {
        const val      = values[i];
        const label    = labels[i];
        const ratio    = maxVal > 0 ? val / maxVal : 0;
        const bH       = Math.max(chartHeight * ratio, 2);
        const x        = paddingLeft + i * (barWidth + barGap);
        const y        = paddingTop + chartHeight - bH;
        const cx       = x + barWidth / 2;
        const axisY    = paddingTop + chartHeight;

        return (
          <g key={i} className="group">
            {/* Bar */}
            <rect
              x={x} y={y}
              width={barWidth} height={bH}
              rx={4}
              fill="url(#bar-gradient)"
              className="opacity-85 hover:opacity-100 transition-all duration-300 cursor-pointer"
            />
            {/* Value tooltip on hover */}
            <text
              x={cx} y={y - 5}
              textAnchor="middle"
              fontSize={8}
              fontWeight="700"
              fill="#93C5FD"
              fontFamily="system-ui, sans-serif"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {formatYTick(val)}
            </text>
            {/* X-axis label — rotated when dense */}
            {manyBars ? (
              <text
                transform={`translate(${cx}, ${axisY + 6}) rotate(-38)`}
                textAnchor="end"
                fontSize={9}
                fill="#9CA3AF"
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                {truncateLabel(label, maxLabelLen)}
              </text>
            ) : (
              <text
                x={cx} y={axisY + 16}
                textAnchor="middle"
                fontSize={9}
                fill="#9CA3AF"
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                {truncateLabel(label, maxLabelLen)}
              </text>
            )}
          </g>
        );
      })}

      {/* X-axis baseline */}
      <line
        x1={paddingLeft} y1={paddingTop + chartHeight}
        x2={totalWidth - paddingRight} y2={paddingTop + chartHeight}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1.5}
      />
    </svg>
  );

  return (
    <div className="bg-[#1A2235]/40 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-md w-full">
      {title && <h4 className="font-bold text-xs text-white mb-3 tracking-tight">{title}</h4>}
      {needsScroll ? (
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-1">
          {svg}
        </div>
      ) : svg}
    </div>
  );
}

// ─── Line Chart ──────────────────────────────────────────────────────────────

export function LineChart({ data, xKey, yKey, title }: { data: any[]; xKey: string; yKey: string; title: string }) {
  const labels = data.map(d => getLabel(d, xKey));
  const values = data.map(d => getValue(d, yKey));
  const maxVal = Math.max(...values, 1);

  const pointCount   = data.length;
  const manyPoints   = pointCount > 8;

  const minPointSlot  = manyPoints ? 50 : 60;
  const paddingLeft   = 64;
  const paddingRight  = 24;
  const paddingTop    = 30;
  const paddingBottom = manyPoints ? 80 : 50;

  const innerWidth  = Math.max(500 - paddingLeft - paddingRight, pointCount * minPointSlot);
  const totalWidth  = innerWidth + paddingLeft + paddingRight;
  const height      = manyPoints ? 290 : 270;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxLabelLen = manyPoints ? 11 : 9;
  const needsScroll = totalWidth > 500;

  const points = data.map((item, i) => {
    const val   = values[i];
    const ratio = val / maxVal;
    const x     = paddingLeft + (i / Math.max(pointCount - 1, 1)) * innerWidth;
    const y     = paddingTop + chartHeight - chartHeight * ratio;
    return { x, y, label: labels[i], rawValue: getRawValue(item, yKey), val };
  });

  const pathD  = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const axisY  = paddingTop + chartHeight;
  const areaD  = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${axisY} L ${points[0].x} ${axisY} Z`
    : '';

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const svg = (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      style={needsScroll ? { width: totalWidth, height, display: 'block' } : undefined}
      className={needsScroll ? '' : 'w-full h-auto'}
      aria-label={title}
    >
      <defs>
        <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Y-axis gridlines + labels */}
      {yTicks.map((ratio, i) => {
        const yVal = maxVal * ratio;
        const y    = paddingTop + chartHeight * (1 - ratio);
        return (
          <g key={i}>
            <line
              x1={paddingLeft} y1={y}
              x2={totalWidth - paddingRight} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 8} y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#9CA3AF"
              fontFamily="system-ui, sans-serif"
              fontWeight="500"
            >
              {formatYTick(yVal)}
            </text>
          </g>
        );
      })}

      {/* Fill Area */}
      {areaD && <path d={areaD} fill="url(#line-gradient)" />}

      {/* Line Path */}
      {pathD && (
        <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Data Points */}
      {points.map((p, i) => (
        <g key={i} className="group">
          <circle cx={p.x} cy={p.y} r={4}   fill="#0B1220" stroke="#3B82F6" strokeWidth={2} className="cursor-pointer" />
          <circle cx={p.x} cy={p.y} r={10}  fill="transparent" className="cursor-pointer" />
          {/* Hover tooltip */}
          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <rect x={p.x - 32} y={p.y - 26} width={64} height={18} rx={4} fill="#111827" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            <text x={p.x} y={p.y - 14} textAnchor="middle" fill="#FFFFFF" fontSize={8} fontWeight="700" fontFamily="system-ui, sans-serif">
              {formatYTick(p.val)}
            </text>
          </g>
          {/* X-axis label */}
          {manyPoints ? (
            <text
              transform={`translate(${p.x}, ${axisY + 6}) rotate(-38)`}
              textAnchor="end"
              fontSize={9}
              fill="#9CA3AF"
              fontFamily="system-ui, sans-serif"
              fontWeight="600"
            >
              {truncateLabel(p.label, maxLabelLen)}
            </text>
          ) : (
            <text
              x={p.x} y={axisY + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#9CA3AF"
              fontFamily="system-ui, sans-serif"
              fontWeight="600"
            >
              {truncateLabel(p.label, maxLabelLen)}
            </text>
          )}
        </g>
      ))}

      {/* X-axis baseline */}
      <line
        x1={paddingLeft} y1={axisY}
        x2={totalWidth - paddingRight} y2={axisY}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1.5}
      />
    </svg>
  );

  return (
    <div className="bg-[#1A2235]/40 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-md w-full">
      {title && <h4 className="font-bold text-xs text-white mb-3 tracking-tight">{title}</h4>}
      {needsScroll ? (
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-1">
          {svg}
        </div>
      ) : svg}
    </div>
  );
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

export function PieChart({ data, xKey, yKey, title }: { data: any[]; xKey: string; yKey: string; title: string }) {
  const labels  = data.map(d => getLabel(d, xKey));
  const values  = data.map(d => getValue(d, yKey));
  const totalVal = values.reduce((sum, v) => sum + v, 0);

  const colors = [
    '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981',
    '#F59E0B', '#EF4444', '#EC4899', '#6366F1',
    '#84CC16', '#F97316',
  ];

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * (percent - 0.25));
    const y = Math.sin(2 * Math.PI * (percent - 0.25));
    return [x, y];
  };

  let accumulatedPercent = 0;
  const cx = 110, cy = 110, radius = 82;

  const slices = data.map((item, i) => {
    const val     = values[i];
    const percent = totalVal > 0 ? val / totalVal : 0;
    const startPercent = accumulatedPercent;
    accumulatedPercent += percent;

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY]     = getCoordinatesForPercent(accumulatedPercent);

    const x1 = cx + startX * radius;
    const y1 = cy + startY * radius;
    const x2 = cx + endX * radius;
    const y2 = cy + endY * radius;

    const largeArcFlag = percent > 0.5 ? 1 : 0;
    const pathData = percent >= 0.999
      ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      pathData,
      color:   colors[i % colors.length],
      label:   labels[i],
      percent: (percent * 100).toFixed(1),
      value:   getRawValue(item, yKey),
    };
  });

  // Many slices — use compact legend text
  const manySlices = slices.length > 6;

  return (
    <div className="bg-[#1A2235]/40 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-md w-full">
      {title && <h4 className="font-bold text-xs text-white mb-3 tracking-tight">{title}</h4>}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Donut SVG */}
        <svg viewBox="0 0 220 220" className="w-36 h-36 shrink-0 mx-auto sm:mx-0">
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.pathData}
              fill={slice.color}
              className="hover:opacity-90 hover:scale-[1.02] origin-[110px_110px] transition-all duration-300 cursor-pointer"
            >
              <title>{`${slice.label}: ${slice.value} (${slice.percent}%)`}</title>
            </path>
          ))}
          <circle cx={cx} cy={cy} r={radius * 0.52} fill="#0B1220" />
        </svg>

        {/* Legend — scrollable when many slices */}
        <div
          className={`flex-1 space-y-1.5 w-full ${manySlices ? 'max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent' : ''}`}
        >
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-[10px] font-medium min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-gray-300" title={slice.label}>
                  {manySlices ? truncateLabel(slice.label, 18) : slice.label}
                </span>
              </div>
              <span className="font-bold text-white shrink-0 text-[10px]">
                {formatYTick(typeof slice.value === 'number' ? slice.value : parseFloat(String(slice.value).replace(/[^\d.-]/g,'')) || 0)}&nbsp;
                <span className="text-gray-400 font-medium">({slice.percent}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chart Renderer ──────────────────────────────────────────────────────────

export function ChartRenderer({ visualization }: { visualization: VisualizationData }) {
  if (!visualization || !visualization.type || !visualization.data) return null;

  const { type, title, xKey = 'label', yKey = 'value', data } = visualization;

  switch (type) {
    case 'kpi':
      return <KPICard title={title} value={data[0]?.value ?? data[0]?.[yKey] ?? ''} />;
    case 'table':
      return <TableView data={data} />;
    case 'line':
      return <LineChart data={data} xKey={xKey} yKey={yKey} title={title} />;
    case 'bar':
      return <BarChart data={data} xKey={xKey} yKey={yKey} title={title} />;
    case 'pie':
      return <PieChart data={data} xKey={xKey} yKey={yKey} title={title} />;
    default:
      return null;
  }
}
