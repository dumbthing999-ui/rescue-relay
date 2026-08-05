"use client";

// Rescue Relay — live impact charts (client island).
// Recharts requires a client boundary; the page itself stays a server component.
// All charts: isAnimationActive={false} (reduced-motion safe), role="img" +
// aria-label, and every value is reachable in the "Full rescue log" table on
// the same page (the accessibility fallback).

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SURFACE = "#1a1d27";
const GRID = "#2c2c2a";
const INK = "#f3f4f6";
const SECONDARY = "#9ca3af";

const TEAL_600 = "#0d9488";
const TEAL_500 = "#14b8a6";
const TEAL_400 = "#2dd4bf";
const GRAY = "#2c2c2a";
const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";

export interface DayPoint {
  day: string; // YYYY-MM-DD
  lbs: number;
}
export interface NeighborhoodRow {
  neighborhood: string;
  lbs: number;
}
export interface DonorRow {
  donor_id: string;
  name: string;
  lbs: number;
}
export interface OutcomeWeek {
  week: string;
  delivered: number;
  expired: number;
}

const axisTick = { fill: SECONDARY, fontSize: 11 };
const axisLabel = { fill: INK, fontSize: 12 };

function fmtLbs(n: number) {
  return n.toLocaleString("en-US");
}

function monthDay(day: string) {
  // day is YYYY-MM-DD; display as "Aug 5"
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// 30-day trend — AreaChart, single series lbs/day
// ---------------------------------------------------------------------------

export function TrendChart({ data }: { data: DayPoint[] }) {
  return (
    <div role="img" aria-label="Pounds rescued per day over the last 30 days">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL_500} stopOpacity={0.18} />
              <stop offset="100%" stopColor={TEAL_500} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={monthDay}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={24}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => fmtLbs(v)}
          />
          <Tooltip
            cursor={{ stroke: SECONDARY, strokeDasharray: "3 3" }}
            contentStyle={{
              background: SURFACE,
              border: `1px solid ${GRID}`,
              borderRadius: 12,
              color: INK,
              fontSize: 12,
            }}
            labelFormatter={(label) => monthDay(String(label))}
            formatter={(value: number | string, name: string) => [
              `${fmtLbs(Number(value))} lbs`,
              name === "lbs" ? "rescued" : name,
            ]}
          />
          <Area
            type="monotone"
            dataKey="lbs"
            stroke={TEAL_500}
            strokeWidth={2}
            fill="url(#trendFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-neighborhood — horizontal bars, sequential teal, low → high
// ---------------------------------------------------------------------------

const neighborhoodColors = [TEAL_600, TEAL_500, TEAL_400];

export function NeighborhoodChart({ data }: { data: NeighborhoodRow[] }) {
  return (
    <div role="img" aria-label="Pounds rescued by neighborhood">
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis
            type="number"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtLbs(v)}
          />
          <YAxis
            type="category"
            dataKey="neighborhood"
            tick={{ fill: INK, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            cursor={{ fill: GRID, opacity: 0.4 }}
            contentStyle={{
              background: SURFACE,
              border: `1px solid ${GRID}`,
              borderRadius: 12,
              color: INK,
              fontSize: 12,
            }}
            formatter={(value: number | string) => [`${fmtLbs(Number(value))} lbs`, "rescued"]}
          />
          <Bar
            dataKey="lbs"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            label={{
              position: "right",
              fill: INK,
              fontSize: 12,
              fontWeight: 600,
              formatter: (v: number | string) => fmtLbs(Number(v)),
            }}
          >
            {data.map((row, i) => (
              <Cell key={row.neighborhood} fill={neighborhoodColors[i % neighborhoodColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Donor leaderboard — #1 teal, ranks 2-5 gray, rank labels
// ---------------------------------------------------------------------------

export function DonorChart({ data }: { data: DonorRow[] }) {
  const labeled = data.map((row, i) => ({
    ...row,
    rankLabel: i === 0 ? "#1" : i === 1 ? "#2" : i === 2 ? "#3" : i === 3 ? "#4" : "#5",
  }));
  return (
    <div role="img" aria-label="Top 5 donors by pounds rescued">
      <ResponsiveContainer width="100%" height={Math.max(220, labeled.length * 44)}>
        <BarChart
          data={labeled}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis
            type="number"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtLbs(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: INK, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={130}
            tickFormatter={(name: string, index: number) =>
              `${labeled[index]?.rankLabel ?? ""} ${name}`
            }
          />
          <Tooltip
            cursor={{ fill: GRID, opacity: 0.4 }}
            contentStyle={{
              background: SURFACE,
              border: `1px solid ${GRID}`,
              borderRadius: 12,
              color: INK,
              fontSize: 12,
            }}
            formatter={(value: number | string) => [`${fmtLbs(Number(value))} lbs`, "rescued"]}
          />
          <Bar
            dataKey="lbs"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            label={{
              position: "right",
              fill: INK,
              fontSize: 12,
              fontWeight: 600,
              formatter: (v: number | string) => fmtLbs(Number(v)),
            }}
          >
            {labeled.map((row, i) => (
              <Cell key={row.donor_id} fill={i === 0 ? TEAL_500 : GRAY} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rescue outcomes — stacked weekly, delivered vs expired
// ---------------------------------------------------------------------------

export function OutcomeChart({ data }: { data: OutcomeWeek[] }) {
  return (
    <div role="img" aria-label="Weekly rescue outcomes, delivered versus expired">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="week"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => fmtLbs(v)}
          />
          <Tooltip
            cursor={{ fill: GRID, opacity: 0.4 }}
            contentStyle={{
              background: SURFACE,
              border: `1px solid ${GRID}`,
              borderRadius: 12,
              color: INK,
              fontSize: 12,
            }}
            formatter={(value: number | string, name: string) => [
              `${fmtLbs(Number(value))} lbs`,
              name === "delivered" ? "delivered" : "expired",
            ]}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: INK, fontSize: 12 }}>{value}</span>
            )}
          />
          <Bar dataKey="delivered" stackId="outcome" fill={GOOD} radius={[0, 0, 0, 0]} isAnimationActive={false} />
          <Bar
            dataKey="expired"
            stackId="outcome"
            fill={CRITICAL}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Shared axes legend for the small charts (labels live on axis lines).
export function ChartLegend() {
  return (
    <p className="text-xs text-ink-muted">
      <span className="font-semibold" style={{ color: axisLabel.fill }}>
        Y axis
      </span>
      : lbs ·{" "}
      <span className="font-semibold" style={{ color: axisLabel.fill }}>
        X axis
      </span>
      : category
    </p>
  );
}
