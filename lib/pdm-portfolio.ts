/**
 * Portfolio derived from the frozen telemetry seed. The live session never changes these figures.
 * Partner names and the per-claim amount are placeholders.
 */
import { isBookedOutcome, telemetrySeed, type TelemetryPartner, type TelemetrySession } from "./telemetry";

/** Hackathon-scale illustrative claim. Fund approved is decided rows times this amount. */
export const ILLUSTRATIVE_FUND_PER_CLAIM = 25_000;

const partnerOrder: TelemetryPartner[] = ["CDW", "SoftwareOne", "Insight", "SHI"];
const quarterOrder = ["Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026"];

export type PortfolioCounts = {
  sessions: number;
  booked: number;
  decided: number;
  signed: number;
  fundApproved: number;
  signedPilotValue: number;
};

export type PortfolioPartnerRow = PortfolioCounts & { partner: TelemetryPartner };
export type PortfolioQuarterRow = PortfolioCounts & { quarter: string };

export type Portfolio = {
  partners: PortfolioPartnerRow[];
  quarters: PortfolioQuarterRow[];
  headlines: PortfolioCounts & { approvedClaims: number; awaitingDecision: number };
};

function isDecided(row: TelemetrySession) {
  return row.outcome === "Hackathon decided" || row.outcome === "Pilot signed";
}

function tally(rows: readonly TelemetrySession[]): PortfolioCounts {
  const decided = rows.filter(isDecided);
  const signed = rows.filter((row) => row.outcome === "Pilot signed");
  return {
    sessions: rows.length,
    booked: rows.filter((row) => isBookedOutcome(row.outcome)).length,
    decided: decided.length,
    signed: signed.length,
    fundApproved: decided.length * ILLUSTRATIVE_FUND_PER_CLAIM,
    signedPilotValue: signed.reduce((sum, row) => sum + row.fundedValue, 0),
  };
}

/** Sessions, bookings, decisions and signed pilots, per partner and per quarter, from one row set. */
export function portfolioFromHistory(rows: readonly TelemetrySession[]): Portfolio {
  const headlines = tally(rows);
  return {
    headlines: { ...headlines, approvedClaims: headlines.decided, awaitingDecision: headlines.booked - headlines.decided },
    partners: partnerOrder.map((partner) => ({ partner, ...tally(rows.filter((row) => row.partner === partner)) })),
    quarters: quarterOrder.map((quarter) => ({ quarter, ...tally(rows.filter((row) => row.quarter === quarter)) })),
  };
}

/** Frozen book. Excludes the live overlay. */
export const portfolio = portfolioFromHistory(telemetrySeed);

export function formatPortfolioMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString("en-US")}`;
}

export function portfolioSummary(book: Portfolio = portfolio) {
  const { signed, booked, awaitingDecision } = book.headlines;
  return `${signed} pilots signed from ${booked} booked hackathons. ${awaitingDecision} are still awaiting a decision.`;
}

export function fewestSignedPartner(book: Portfolio = portfolio) {
  return [...book.partners].sort((a, b) => a.signed - b.signed || a.partner.localeCompare(b.partner))[0];
}

export function fewestSignedLine(book: Portfolio = portfolio) {
  const quiet = fewestSignedPartner(book);
  return `${quiet.partner} has signed the fewest: ${quiet.signed} of ${quiet.booked} booked.`;
}

/** Signed pilot value divided by fund approved, rounded. */
export function fundRatio(book: Portfolio = portfolio) {
  const { signedPilotValue, fundApproved } = book.headlines;
  if (!fundApproved) return 0;
  return Math.round(signedPilotValue / fundApproved);
}
