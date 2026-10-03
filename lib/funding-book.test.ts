import { describe, expect, it } from "vitest";

import {
  approvedByPartner,
  approvedTotal,
  awaitingReviewCount,
  fundingBook,
  fundingClaimsFromHistory,
  fundingListPageSize,
  fundingRequestsForPdm,
  liveFundingRequest,
  quietPartner,
} from "./funding-book";
import { ILLUSTRATIVE_FUND_PER_CLAIM, portfolio } from "./pdm-portfolio";
import { initialSessionGraph } from "./seed";
import { fundingClaimAmount, submitFundingClaim } from "./session";
import { isBookedOutcome, telemetrySeed } from "./telemetry";

describe("funding book", () => {
  it("reconciles approved claims with the portfolio's fund approved", () => {
    expect(approvedTotal()).toEqual({ amount: portfolio.headlines.fundApproved, count: portfolio.headlines.approvedClaims });
    for (const partner of portfolio.partners) {
      expect(approvedByPartner(partner.partner)).toBe(partner.fundApproved);
    }
    expect(fundingBook.every((row) => row.amount === ILLUSTRATIVE_FUND_PER_CLAIM)).toBe(true);
    expect(fundingClaimAmount).toBe(ILLUSTRATIVE_FUND_PER_CLAIM);
  });

  it("derives one claim per submitted seeded row, and never names Heartland", () => {
    const submitted = telemetrySeed.filter((row) => row.fundingClaimSubmitted);
    expect(fundingClaimsFromHistory(telemetrySeed).map((row) => row.id)).toEqual(fundingBook.map((row) => row.id));
    expect(fundingBook).toHaveLength(submitted.length);
    expect(fundingBook.every((row) => row.customer !== "Heartland Mutual Insurance")).toBe(true);
    expect(new Set(fundingBook.map((row) => row.customer)).size).toBeGreaterThan(12);
    const partners = new Set(fundingBook.map((row) => row.partner));
    expect([...partners].sort()).toEqual(["CDW", "Insight", "SHI", "SoftwareOne"]);
    expect(fundingBook.some((row) => row.partner === "Softchoice")).toBe(false);
    for (const row of fundingBook) {
      const source = telemetrySeed.find((item) => item.id === row.id);
      expect(source?.fundingClaimSubmitted).toBe(true);
      expect(isBookedOutcome(source!.outcome)).toBe(true);
      expect(row.useCase).toBe(source?.pattern);
      expect(row.evidence.checklist.map((item) => item.label)).toEqual([
        "Hackathon booked",
        "Attendees named",
        "Evidence attributed",
        "Value basis confirmed",
      ]);
      expect(["Confirmed in the room", "Respondent-confirmed, unverified"]).toContain(row.evidence.valueBasis);
    }
    const decided = telemetrySeed.filter((row) => row.outcome === "Hackathon decided" || row.outcome === "Pilot signed");
    expect(decided.every((row) => row.fundingClaimSubmitted)).toBe(true);
    const returned = fundingBook.filter((row) => row.status === "returned");
    const open = fundingBook.filter((row) => row.status !== "approved");
    expect(returned.length).toBeGreaterThan(0);
    expect(returned.length).toBeLessThanOrEqual(Math.ceil(open.length / 12) + 1);
  });

  it("has more rows than one page and leads with the claims awaiting review", () => {
    expect(fundingBook.length).toBeGreaterThan(fundingListPageSize);
    expect(awaitingReviewCount(fundingBook)).toBeGreaterThan(0);
    expect(fundingBook[0].status).toBe("awaiting-review");
    const firstOther = fundingBook.findIndex((row) => row.status !== "awaiting-review");
    expect(fundingBook.slice(0, firstOther).every((row) => row.status === "awaiting-review")).toBe(true);
  });

  it("adds the Heartland claim only after the partner records the submission", () => {
    expect(liveFundingRequest(initialSessionGraph, "CDW")).toBeNull();
    expect(fundingRequestsForPdm(initialSessionGraph, "CDW").some((row) => row.customer === "Heartland Mutual Insurance")).toBe(false);

    const submitted = submitFundingClaim(initialSessionGraph, "Ravi Menon");
    const live = liveFundingRequest(submitted, "CDW");
    expect(live).toMatchObject({
      partner: "CDW",
      customer: "Heartland Mutual Insurance",
      status: "awaiting-review",
      amount: fundingClaimAmount,
      quarter: "Q3 2026",
      live: true,
    });
    const rows = fundingRequestsForPdm(submitted, "CDW");
    expect(rows.filter((row) => row.customer === "Heartland Mutual Insurance")).toHaveLength(1);
    expect(rows.find((row) => row.live)?.status).toBe("awaiting-review");
    expect(rows.length).toBe(fundingBook.length + 1);
    expect(approvedTotal(rows).amount).toBe(portfolio.headlines.fundApproved);
  });

  it("names the partner with the fewest signed pilots", () => {
    expect(quietPartner().partner).toBe("Insight");
    expect(quietPartner().signed).toBe(4);
  });
});
