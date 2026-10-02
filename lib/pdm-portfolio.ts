/** Frozen illustrative book. Not derived from telemetry, and not changed by the live session. */

export type PortfolioPartner = {
  partner: "CDW" | "SoftwareOne" | "Insight" | "SHI";
  sessions: number;
  booked: number;
  signed: number;
  fundApproved: number;
  pipeline: number;
};

export const portfolioPartners: readonly PortfolioPartner[] = [
  { partner: "CDW", sessions: 48, booked: 22, signed: 9, fundApproved: 1_800_000, pipeline: 2_400_000 },
  { partner: "SoftwareOne", sessions: 36, booked: 19, signed: 11, fundApproved: 2_100_000, pipeline: 1_600_000 },
  { partner: "Insight", sessions: 14, booked: 3, signed: 1, fundApproved: 200_000, pipeline: 400_000 },
  { partner: "SHI", sessions: 27, booked: 12, signed: 5, fundApproved: 900_000, pipeline: 1_100_000 },
];

export const portfolioHeadlines = {
  sessions: 125,
  booked: 56,
  signed: 26,
  fundApproved: 5_000_000,
  claims: 18,
  pipeline: 5_500_000,
} as const;

/** Frozen quarterly book. Sums to the headlines. Not derived from telemetry. */
export const portfolioQuarters = [
  { quarter: "Q4 2024", sessions: 10, booked: 4, signed: 1 },
  { quarter: "Q1 2025", sessions: 12, booked: 5, signed: 2 },
  { quarter: "Q2 2025", sessions: 13, booked: 6, signed: 2 },
  { quarter: "Q3 2025", sessions: 14, booked: 6, signed: 3 },
  { quarter: "Q4 2025", sessions: 16, booked: 7, signed: 3 },
  { quarter: "Q1 2026", sessions: 18, booked: 8, signed: 4 },
  { quarter: "Q2 2026", sessions: 20, booked: 9, signed: 5 },
  { quarter: "Q3 2026", sessions: 22, booked: 11, signed: 6 },
] as const;

export function formatPortfolioMoney(value: number) {
  return `$${(value / 1_000_000).toFixed(1)}M`;
}

export function portfolioLine() {
  return `Booked hackathons outrun signed pilots, ${portfolioHeadlines.booked} to ${portfolioHeadlines.signed}. Insight is the quiet partner.`;
}
