import { describe, expect, it } from "vitest";

import { approvedTotal, fundingBook } from "./funding-book";
import { ILLUSTRATIVE_FUND_PER_CLAIM, portfolio, portfolioFromHistory } from "./pdm-portfolio";
import { isBookedOutcome, summarizeTelemetry, telemetrySeed } from "./telemetry";

describe("portfolio from the telemetry seed", () => {
  it("matches the telemetry aggregates and keeps each partner inside the funnel", () => {
    const summary = summarizeTelemetry([...telemetrySeed]);
    expect(portfolio.headlines.sessions).toBe(summary.sessionsScoped);
    expect(portfolio.headlines.booked).toBe(summary.hackathonsBooked);
    expect(portfolio.headlines.decided).toBe(summary.hackathonsDecided);
    expect(portfolio.headlines.signed).toBe(summary.pilotsSigned);
    expect(portfolioFromHistory(telemetrySeed).headlines).toEqual(portfolio.headlines);

    for (const partner of portfolio.partners) {
      expect(partner.signed).toBeLessThanOrEqual(partner.decided);
      expect(partner.decided).toBeLessThanOrEqual(partner.booked);
      expect(partner.booked).toBeLessThanOrEqual(partner.sessions);
      expect(partner.signed).toBeGreaterThan(0);
      expect(partner.signed).toBeLessThan(portfolio.headlines.signed);
      const claims = telemetrySeed.filter((row) => row.partner === partner.partner && row.fundingClaimSubmitted);
      expect(claims.length).toBeLessThanOrEqual(partner.booked);
      expect(claims.every((row) => isBookedOutcome(row.outcome))).toBe(true);
    }
  });

  it("sets fund approved to the decided claims at the illustrative amount", () => {
    expect(portfolio.headlines.fundApproved).toBe(portfolio.headlines.decided * ILLUSTRATIVE_FUND_PER_CLAIM);
    expect(approvedTotal(fundingBook).amount).toBe(portfolio.headlines.fundApproved);
    expect(approvedTotal(fundingBook).count).toBe(portfolio.headlines.approvedClaims);
    expect(fundingBook.filter((row) => row.status === "approved").every((row) => row.amount === ILLUSTRATIVE_FUND_PER_CLAIM)).toBe(true);
  });
});
