'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export type DailyUsagePoint = {
  date: string;
  image: number;
  video: number;
  audio: number;
  chat: number;
};

type SeriesKey = 'image' | 'video' | 'audio' | 'chat';

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: 'image', label: 'Image', color: '#3b82f6' },
  { key: 'video', label: 'Video', color: '#a855f7' },
  { key: 'audio', label: 'Audio', color: '#f59e0b' },
  { key: 'chat',  label: 'Chat',  color: '#22c55e' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function creditsToTokenLabel(credits: number, tokensPerCredit: number): string | null {
  if (!tokensPerCredit || !credits) return null;
  const tokens = credits * tokensPerCredit;
  if (tokens >= 1_000_000) return `~${(tokens / 1_000_000).toFixed(1)}M tokens`;
  if (tokens >= 1_000) return `~${Math.round(tokens / 1_000)}K tokens`;
  return `${tokens} tokens`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  tokensPerCredit,
  planLabel,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  tokensPerCredit: number;
  planLabel: string;
}) {
  if (!active || !payload?.length) return null;

  const hasData = payload.some((e) => e.value > 0);
  if (!hasData) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a1a2e] px-4 py-3 shadow-xl min-w-[200px]">
      <p className="mb-2 text-sm font-semibold text-white">{label}</p>
      {payload.map((entry) => {
        if (entry.value === 0) return null;
        const isChat = entry.name === 'Chat';
        const tokenLabel = isChat ? creditsToTokenLabel(entry.value, tokensPerCredit) : null;
        return (
          <div key={entry.name} className="mb-1 last:mb-0">
            <span className="text-sm" style={{ color: entry.color }}>
              {entry.name} : {entry.value} cr
            </span>
            {tokenLabel && (
              <span className="ml-1.5 text-xs text-white/50">({tokenLabel})</span>
            )}
          </div>
        );
      })}
      {planLabel && (
        <p className="mt-2 border-t border-white/10 pt-2 text-xs text-white/30">
          Rate: {planLabel} plan
        </p>
      )}
    </div>
  );
}

// ─── Checkbox Legend ──────────────────────────────────────────────────────────

function CheckboxLegend({
  visible,
  onToggle,
}: {
  visible: Record<SeriesKey, boolean>;
  onToggle: (key: SeriesKey) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
      {SERIES.map(({ key, label, color }) => {
        const checked = visible[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            aria-pressed={checked}
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition"
              style={{
                borderColor: color,
                background: checked ? color : 'transparent',
              }}
            >
              {checked && (
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none">
                  <path
                    d="M1 4l3 3 5-6"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              className="text-sm transition"
              style={{ color: checked ? color : '#6b7280' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CreditUsageChartProps {
  data: DailyUsagePoint[];
  tokensPerCredit?: number;
  planLabel?: string;
}

export default function CreditUsageChart({
  data,
  tokensPerCredit = 0,
  planLabel = '',
}: CreditUsageChartProps) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    image: true,
    video: true,
    audio: true,
    chat: true,
  });

  function toggleSeries(key: SeriesKey) {
    const visibleCount = Object.values(visible).filter(Boolean).length;
    if (visible[key] && visibleCount === 1) return;
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={(props.payload as unknown) as { name: string; value: number; color: string }[]}
                label={props.label as string}
                tokensPerCredit={tokensPerCredit}
                planLabel={planLabel}
              />
            )}
            cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
          />

          {visible.image && (
            <Line
              type="monotone"
              dataKey="image"
              name="Image"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }}
            />
          )}
          {visible.video && (
            <Line
              type="monotone"
              dataKey="video"
              name="Video"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#a855f7', strokeWidth: 0 }}
            />
          )}
          {visible.audio && (
            <Line
              type="monotone"
              dataKey="audio"
              name="Audio"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 0 }}
            />
          )}
          {visible.chat && (
            <Line
              type="monotone"
              dataKey="chat"
              name="Chat"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#22c55e', strokeWidth: 0 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <CheckboxLegend visible={visible} onToggle={toggleSeries} />
    </div>
  );
}
