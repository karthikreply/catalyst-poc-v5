"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import {
  formatPortfolioMoney,
  portfolioHeadlines,
  portfolioPartners,
  portfolioQuarters,
} from "@/lib/pdm-portfolio";

const slate = "#334155";
const slateMid = "#64748b";
const slateLight = "#94a3b8";

const dropRows = [
  { stage: "Sessions", value: portfolioHeadlines.sessions },
  { stage: "Hackathons booked", value: portfolioHeadlines.booked },
  { stage: "Pilots signed", value: portfolioHeadlines.signed },
];

const partnerRows = portfolioPartners.map((row) => ({
  partner: row.partner,
  signed: row.signed,
  bookedNotSigned: row.booked - row.signed,
  notBooked: row.sessions - row.booked,
}));

const moneyRows = portfolioPartners.map((row) => ({
  partner: row.partner,
  fundApproved: row.fundApproved,
  pipeline: row.pipeline,
}));

function Illustrative({ title, children, table }: { title: string; children: ReactNode; table: ReactNode }) {
  return (
    <section className="md-card-outlined flex h-full min-w-0 flex-col p-5" aria-label={title}>
      <div className="flex min-h-16 flex-col justify-end">
        <p className="text-xs font-medium text-black/45">Illustrative</p>
        <h2 className="mt-1 text-base font-semibold">{title}</h2>
      </div>
      <div className="mt-3 h-[200px] w-full min-w-0">{children}</div>
      <div className="mt-3 overflow-x-auto">{table}</div>
    </section>
  );
}

function NumberTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]">
          {headers.map((header) => <th key={header} className="py-2 pr-3 font-medium">{header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row[0])} className="border-b border-[var(--md-sys-color-outline-variant)]">
            {row.map((cell, index) => <td key={`${row[0]}-${index}`} className="py-2 pr-3 tabular-nums">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PortfolioCharts() {
  return (
    <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-2">
      <Illustrative
        title="Where the book drops"
        table={<NumberTable headers={["Stage", "Count"]} rows={dropRows.map((row) => [row.stage, row.value])} />}
      >
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dropRows}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="stage" tick={{ fill: slate, fontSize: 12 }} />
          <YAxis tick={{ fill: slate, fontSize: 12 }} />
          <Bar dataKey="value" name="Count" fill={slate} isAnimationActive={false} />
        </BarChart>
        </ResponsiveContainer>
      </Illustrative>

      <Illustrative
        title="Partners"
        table={(
          <NumberTable
            headers={["Partner", "Pilots signed", "Booked, not signed", "Not booked"]}
            rows={partnerRows.map((row) => [row.partner, row.signed, row.bookedNotSigned, row.notBooked])}
          />
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={partnerRows} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fill: slate, fontSize: 12 }} />
          <YAxis type="category" dataKey="partner" tick={{ fill: slate, fontSize: 12 }} width={96} />
          <Legend />
          <Bar dataKey="signed" name="Pilots signed" stackId="book" fill={slate} isAnimationActive={false} />
          <Bar dataKey="bookedNotSigned" name="Booked, not signed" stackId="book" fill={slateMid} isAnimationActive={false} />
          <Bar dataKey="notBooked" name="Not booked" stackId="book" fill={slateLight} isAnimationActive={false} />
        </BarChart>
        </ResponsiveContainer>
      </Illustrative>

      <Illustrative
        title="Money"
        table={(
          <NumberTable
            headers={["Partner", "Fund approved", "Pipeline"]}
            rows={moneyRows.map((row) => [row.partner, formatPortfolioMoney(row.fundApproved), formatPortfolioMoney(row.pipeline)])}
          />
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={moneyRows}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="partner" tick={{ fill: slate, fontSize: 12 }} />
          <YAxis tickFormatter={(value: number) => formatPortfolioMoney(value)} tick={{ fill: slate, fontSize: 12 }} width={56} />
          <Legend />
          <Bar dataKey="fundApproved" name="Fund approved" fill={slate} isAnimationActive={false} />
          <Bar dataKey="pipeline" name="Pipeline" fill={slateMid} isAnimationActive={false} />
        </BarChart>
        </ResponsiveContainer>
      </Illustrative>

      <Illustrative
        title="Hackathons booked by quarter"
        table={(
          <NumberTable
            headers={["Quarter", "Sessions", "Hackathons booked", "Pilots signed"]}
            rows={portfolioQuarters.map((row) => [row.quarter, row.sessions, row.booked, row.signed])}
          />
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...portfolioQuarters]}>
          <CartesianGrid stroke="#e2e8f0" />
          <XAxis dataKey="quarter" tick={{ fill: slate, fontSize: 11 }} />
          <YAxis tick={{ fill: slate, fontSize: 12 }} />
          <Line dataKey="booked" name="Hackathons booked" stroke={slate} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
        </ResponsiveContainer>
      </Illustrative>
    </div>
  );
}
