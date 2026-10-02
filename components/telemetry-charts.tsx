"use client";

import { Bar, BarChart, Funnel, FunnelChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { isBookedOutcome, summarizeTelemetry, type TelemetrySession } from "@/lib/telemetry";

const slate = "#334155";
const slateMid = "#64748b";

const quarterOrder = ["Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026"];

function dropPercent(previous: number, current: number) {
  if (previous <= 0) return 0;
  return Math.round(((previous - current) / previous) * 100);
}

export function funnelStages(rows: TelemetrySession[]) {
  const summary = summarizeTelemetry(rows);
  return [
    ["Scoped", rows.length],
    ["Run", summary.sessionsRun],
    ["Hackathon proposed", summary.hackathonsProposed],
    ["Hackathon booked", summary.hackathonsBooked],
    ["Pilot signed", summary.pilotsSigned],
  ] as const;
}

export function quarterSeries(rows: Pick<TelemetrySession, "quarter" | "outcome">[]) {
  const present = new Set(rows.map((row) => row.quarter));
  const known = quarterOrder.filter((quarter) => present.has(quarter));
  const extra = [...present].filter((quarter) => !quarterOrder.includes(quarter));
  return [...known, ...extra].map((quarter) => {
    const inQuarter = rows.filter((row) => row.quarter === quarter);
    return {
      quarter,
      sessions: inQuarter.length,
      booked: inQuarter.filter((row) => isBookedOutcome(row.outcome)).length,
    };
  });
}

export function TelemetryFunnel({ rows }: { rows: TelemetrySession[] }) {
  const stages = funnelStages(rows).map(([name, value]) => ({ name, value }));
  return (
    <section className="md-card-outlined mt-5 p-5" aria-label="Conversion funnel">
      <h2 className="md-title-medium">Conversion funnel · scoped cohort n={rows.length}</h2>
      <div className="mt-4 h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Funnel dataKey="value" data={stages} isAnimationActive={false} fill={slate} />
          </FunnelChart>
        </ResponsiveContainer>
      </div>
      <ol className="mt-4 grid gap-2 md:grid-cols-5">
        {stages.map((stage, index) => {
          const previous = index === 0 ? null : stages[index - 1].value;
          const drop = previous === null ? null : dropPercent(previous, stage.value);
          return (
            <li key={stage.name} className="rounded-[var(--md-sys-shape-small)] border-l-4 border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container)] p-4">
              <p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{stage.name}</p>
              <p className="md-title-large mt-1">{stage.value}</p>
              {drop !== null && <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">{drop}% did not continue</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function BookedShareChart({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number; booked: number; caption?: string }[];
}) {
  const data = rows.map((row) => ({
    label: row.label,
    share: row.count ? Math.round((row.booked / row.count) * 100) : 0,
  }));
  return (
    <section className="md-card-outlined flex h-full min-w-0 flex-col p-5" aria-label={title}>
      <h2 className="md-title-medium flex min-h-20 items-end">{title}</h2>
      <div className="mt-4 h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: slate, fontSize: 12 }} />
            <YAxis type="category" dataKey="label" width={108} tick={{ fill: slate, fontSize: 12 }} />
            <Bar dataKey="share" name="Booked share" fill={slate} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-auto space-y-2 pt-4">
        {rows.map((row) => (
          <li key={row.label} className="md-body-medium flex justify-between gap-3">
            <span>{row.label}{row.caption && <span className="md-label-medium ml-2 text-[var(--md-sys-color-on-surface-variant)]">{row.caption}</span>}</span>
            <span className="font-semibold tabular-nums">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TelemetryQuarterChart({ rows, title }: { rows: TelemetrySession[]; title: string }) {
  const series = quarterSeries(rows);
  return (
    <section className="md-card-outlined flex h-full min-w-0 flex-col p-5" aria-label="By quarter">
      <div className="flex min-h-20 flex-col justify-end">
        <h2 className="md-title-medium">By quarter</h2>
        <p className="md-body-medium text-[var(--md-sys-color-on-surface-variant)]">{title}</p>
      </div>
      <div className="mt-4 h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ left: 8, right: 8 }}>
            <XAxis dataKey="quarter" tick={{ fill: slate, fontSize: 11 }} interval={0} />
            <YAxis tick={{ fill: slate, fontSize: 12 }} width={36} />
            <Line dataKey="sessions" name="Sessions" stroke={slate} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="booked" name="Hackathons booked" stroke={slateMid} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
