/**
 * Funding claims derived from the telemetry seed. One claim per row that submitted one.
 * Amounts are the illustrative hackathon-scale figure, so approved claims equal fund approved.
 */
import { ILLUSTRATIVE_FUND_PER_CLAIM, fewestSignedPartner } from "./pdm-portfolio";
import type { SessionGraph } from "./seed";
import { isBookedOutcome, telemetrySeed, type TelemetrySession } from "./telemetry";

export type FundingStatus = "awaiting-review" | "approved" | "returned";

export type FundingClaimRow = {
  id: string;
  partner: string;
  customer: string;
  useCase: string;
  quarter: string;
  amount: number;
  status: FundingStatus;
  evidence: {
    quotes: number;
    valueBasis: string;
    checklist: { label: string; done: boolean }[];
  };
  /** The live Heartland claim opens the existing pack. Seeded rows only expand. */
  live?: boolean;
};

export const fundingListPageSize = 12;

const customers = [
  "Prairie Shield Insurance",
  "Lakeside Community Bank",
  "Riverbend Health",
  "Ironwood Components",
  "Copperline Stores",
  "Clearwater County",
  "Harbor Mutual",
  "Granite State Credit Union",
  "Summit Care Network",
  "Bluefin Industrial",
  "Beacon Home Supply",
  "Mill Valley Water",
  "Cedar Ridge Assurance",
  "Meridian Trust",
  "Northgate Clinics",
  "Keystone Fabrication",
  "Oakmont Outfitters",
  "Ridgeway School District",
  "Tidewater Life",
  "Fairview Savings",
  "Elm Street Medical",
  "Redline Tooling",
  "Juniper Market",
  "Harbor District Housing",
];

const quarterOrder = ["Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026"];

export function fundingStatusLabel(status: FundingStatus) {
  if (status === "awaiting-review") return "Awaiting review";
  if (status === "approved") return "Approved";
  return "Returned";
}

function isDecided(row: TelemetrySession) {
  return row.outcome === "Hackathon decided" || row.outcome === "Pilot signed";
}

function checklist(row: TelemetrySession, returned: boolean) {
  const facilitated = row.delivery !== "self-service";
  return [
    { label: "Hackathon booked", done: isBookedOutcome(row.outcome) },
    { label: "Attendees named", done: facilitated },
    { label: "Evidence attributed", done: true },
    { label: "Value basis confirmed", done: facilitated && !returned },
  ];
}

/** One claim per seeded row with a submission. Status follows the row's stage. */
export function fundingClaimsFromHistory(rows: readonly TelemetrySession[]): FundingClaimRow[] {
  const submitted = rows.filter((row) => row.fundingClaimSubmitted);
  const nonDecided = submitted.filter((row) => !isDecided(row));
  return submitted.map((row) => {
    const openIndex = nonDecided.findIndex((item) => item.id === row.id);
    const returned = openIndex >= 0 && openIndex % 12 === 0;
    const status: FundingStatus = isDecided(row) ? "approved" : returned ? "returned" : "awaiting-review";
    const facilitated = row.delivery !== "self-service";
    return {
      id: row.id,
      partner: row.partner,
      customer: customers[submitted.indexOf(row) % customers.length],
      useCase: row.pattern,
      quarter: row.quarter,
      amount: ILLUSTRATIVE_FUND_PER_CLAIM,
      status,
      evidence: {
        quotes: 1 + (submitted.indexOf(row) % 4),
        valueBasis: facilitated ? "Confirmed in the room" : "Respondent-confirmed, unverified",
        checklist: checklist(row, returned),
      },
    };
  }).sort(compareClaims);
}

function compareClaims(a: FundingClaimRow, b: FundingClaimRow) {
  const rank = (status: FundingStatus) => (status === "awaiting-review" ? 0 : status === "returned" ? 1 : 2);
  const status = rank(a.status) - rank(b.status);
  if (status !== 0) return status;
  const quarter = quarterOrder.indexOf(b.quarter) - quarterOrder.indexOf(a.quarter);
  if (quarter !== 0) return quarter;
  if (Boolean(a.live) !== Boolean(b.live)) return a.live ? -1 : 1;
  return a.partner.localeCompare(b.partner);
}

export const fundingBook: readonly FundingClaimRow[] = Object.freeze(fundingClaimsFromHistory(telemetrySeed));

export function approvedTotal(book: readonly FundingClaimRow[] = fundingBook) {
  const approved = book.filter((row) => row.status === "approved");
  return { amount: approved.reduce((sum, row) => sum + row.amount, 0), count: approved.length };
}

export function approvedByPartner(partner: string, book: readonly FundingClaimRow[] = fundingBook) {
  return book.filter((row) => row.partner === partner && row.status === "approved").reduce((sum, row) => sum + row.amount, 0);
}

export function awaitingReviewCount(book: readonly FundingClaimRow[]) {
  return book.filter((row) => row.status === "awaiting-review").length;
}

export function returnedCount(book: readonly FundingClaimRow[]) {
  return book.filter((row) => row.status === "returned").length;
}

/** The live claim, once the partner has recorded the submission. Null before that. */
export function liveFundingRequest(graph: SessionGraph, partnerName: string): FundingClaimRow | null {
  const claim = graph.session.fundingClaim;
  if (!claim) return null;
  return {
    id: graph.session.id,
    partner: partnerName,
    customer: graph.session.customerName,
    useCase: graph.outcome.useCase || "Not captured",
    amount: ILLUSTRATIVE_FUND_PER_CLAIM,
    status: "awaiting-review",
    quarter: "Q3 2026",
    evidence: {
      quotes: graph.captures.length,
      valueBasis: "Confirmed in the room",
      checklist: [
        { label: "Hackathon booked", done: Boolean(graph.hackathon?.booked) },
        { label: "Attendees named", done: graph.attendees.some((person) => person.name.trim()) },
        { label: "Evidence attributed", done: graph.captures.length > 0 },
        { label: "Value basis confirmed", done: true },
      ],
    },
    live: true,
  };
}

/** Seeded claims plus the live claim, when recorded. Awaiting review sorts first. */
export function fundingRequestsForPdm(graph: SessionGraph, partnerName: string): FundingClaimRow[] {
  const live = liveFundingRequest(graph, partnerName);
  return (live ? [...fundingBook, live] : [...fundingBook]).sort(compareClaims);
}

export function formatFundingAmount(amount: number) {
  return `$${amount.toLocaleString("en-US")}`;
}

/** Partner with the fewest signed pilots in the derived book. */
export function quietPartner() {
  return fewestSignedPartner();
}
