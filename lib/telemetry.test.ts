import { describe, expect, it } from "vitest";

import { initialSessionGraph } from "./seed";
import { bookHackathon, markPilotSigned, rankedSolutions, recordNotGoingAhead, setPilotPick, toggleSelected } from "./session";
import {
  buildTelemetrySessions,
  canViewOpportunityDetail,
  liveSessionOutcome,
  mechanicConversion,
  recentTelemetryRows,
  scopeTelemetry,
  sampleRunBookingSummary,
  sampleRunColumnLabel,
  summarizeTelemetry,
  telemetryBenchmarks,
  type TelemetrySession,
} from "./telemetry";

describe("telemetryBenchmarks", () => {
  it("exports the pinned rates and counts", () => {
    expect(telemetryBenchmarks.facilitatedSessions).toBe(150);
    expect(telemetryBenchmarks.selfServiceSessions).toBe(100);
    expect(telemetryBenchmarks.facilitatedConverted).toBe(90);
    expect(telemetryBenchmarks.selfServiceConverted).toBe(22);
    expect(telemetryBenchmarks.selfServiceQualified).toBe(45);
    expect(telemetryBenchmarks.facilitatedConversionRate).toBe(60);
    expect(telemetryBenchmarks.selfServiceConversionRate).toBe(22);
    expect(telemetryBenchmarks.selfServiceQualificationRate).toBe(45);
    expect(telemetryBenchmarks.ghostLedgerSessions).toBe(45);
    expect(telemetryBenchmarks.ghostLedgerConverted).toBe(30);
    expect(telemetryBenchmarks.valueSprintConversionRate).toBe(58);
    expect(telemetryBenchmarks.ghostLedgerConversionRate).toBe(67);
  });

  it("seeds exact cohort sizes", () => {
    const rows = buildTelemetrySessions();
    expect(rows).toHaveLength(250);
    expect(rows.filter((item) => item.delivery === "facilitated")).toHaveLength(150);
    expect(rows.filter((item) => item.delivery === "self-service")).toHaveLength(100);
    expect(rows.filter((item) => item.delivery === "facilitated" && item.converted)).toHaveLength(90);
    expect(rows.filter((item) => item.delivery === "self-service" && item.converted)).toHaveLength(22);
    expect(rows.filter((item) => item.delivery === "self-service" && item.qualified)).toHaveLength(45);
    expect(rows.filter((item) => item.mechanic === "value-sprint")).toHaveLength(205);
    expect(rows.filter((item) => item.mechanic === "ghost-ledger")).toHaveLength(45);
    expect(rows.filter((item) => item.mechanic === "ghost-ledger" && item.converted)).toHaveLength(30);
  });

  it("filters partner view to the active brand only", () => {
    const rows = buildTelemetrySessions();
    const scoped = scopeTelemetry(rows, { actor: "partner", partnerName: "SoftwareOne" });
    expect(scoped.every((item) => item.partner === "SoftwareOne")).toBe(true);
    expect(scoped.some((item) => item.partner === "CDW")).toBe(false);
    expect(scopeTelemetry(rows, { actor: "pdm", partnerName: "SoftwareOne" }).map((item) => item.partner)).toEqual(
      expect.arrayContaining(["CDW", "SoftwareOne", "Insight", "SHI"]),
    );
    expect(scopeTelemetry(rows, { actor: "customer", partnerName: "SoftwareOne" }).map((item) => item.partner)).toEqual(
      expect.arrayContaining(["CDW", "SoftwareOne", "Insight", "SHI"]),
    );
  });

  it("shows per-opportunity values only in opted-in partner detail", () => {
    expect(canViewOpportunityDetail("partner", true)).toBe(true);
    expect(canViewOpportunityDetail("partner", false)).toBe(false);
    expect(canViewOpportunityDetail("pdm", true)).toBe(false);
    expect(canViewOpportunityDetail("customer", true)).toBe(false);
  });

  it("gives the CDW cohort credible scope and funding drop-off", () => {
    const rows = scopeTelemetry(buildTelemetrySessions(), { actor: "partner", partnerName: "CDW" });
    const summary = summarizeTelemetry(rows);

    expect(rows).toHaveLength(63);
    expect(summary.sessionsRun).toBe(51);
    expect(summary.hackathonsBooked).toBe(28);
    expect(summary.hackathonsDecided).toBe(16);
    expect(summary.pilotsSigned).toBe(9);
    expect(summary.fundingClaimsSubmitted).toBeLessThanOrEqual(summary.hackathonsBooked);
    expect(summary.fundingClaimsSubmitted).toBeGreaterThanOrEqual(summary.hackathonsDecided);
    expect(rows.filter((row) => row.fundingClaimSubmitted && row.outcome !== "Hackathon booked" && row.outcome !== "Hackathon decided" && row.outcome !== "Pilot signed")).toHaveLength(0);
  });

  it("varies partner patterns, mechanics, delivery, outcomes, and quarters", () => {
    const rows = scopeTelemetry(buildTelemetrySessions(), { actor: "partner", partnerName: "CDW" });

    expect(new Set(rows.map((row) => row.pattern)).size).toBeGreaterThan(1);
    expect(new Set(rows.map((row) => row.mechanic))).toEqual(new Set(["value-sprint", "ghost-ledger"]));
    expect(new Set(rows.map((row) => row.delivery))).toEqual(new Set(["facilitated", "self-service"]));
    expect(new Set(rows.map((row) => row.outcome)).size).toBeGreaterThan(2);
    expect(new Set(rows.map((row) => row.quarter)).size).toBeGreaterThan(2);
    expect(new Set(rows.map((row) => row.closeStyle))).toEqual(new Set(["owner-and-ask", "board-slide"]));
  });

  it("computes mechanic conversion from the visible rows", () => {
    const rows = scopeTelemetry(buildTelemetrySessions(), { actor: "partner", partnerName: "CDW" });
    const valueSprintRows = rows.filter((row) => row.mechanic === "value-sprint");
    const funded = valueSprintRows.filter((row) => row.converted).length;

    expect(mechanicConversion(rows, "value-sprint")).toEqual({
      funded,
      total: valueSprintRows.length,
      rate: Math.round((funded / valueSprintRows.length) * 100),
    });
  });

  it("drops off from booked to decided to signed, and keeps later stages inside the booked count", () => {
    const rows = buildTelemetrySessions();
    const signed = rows.filter((row) => row.outcome === "Pilot signed");
    const decided = rows.filter((row) => row.outcome === "Hackathon decided");
    const booked = rows.filter((row) => row.outcome === "Hackathon booked");
    const summary = summarizeTelemetry(rows);
    expect(signed.length).toBeGreaterThan(0);
    expect(decided.length).toBeGreaterThan(0);
    expect(signed.every((row) => row.converted)).toBe(true);
    expect(summary.hackathonsBooked).toBe(signed.length + decided.length + booked.length);
    expect(summary.hackathonsBooked).toBe(rows.filter((row) => row.converted).length);
    expect(summary.hackathonsDecided).toBe(signed.length + decided.length);
    expect(summary.hackathonsDecided).toBeLessThan(summary.hackathonsBooked);
    expect(summary.pilotsSigned).toBe(signed.length);
    expect(summary.pilotsSigned).toBeLessThan(summary.hackathonsDecided);
    expect(summary.hackathonsBooked).toBe(112);
    expect(summary.hackathonsDecided).toBe(56);
    expect(summary.pilotsSigned).toBe(28);
    const plan = { CDW: [16, 9], SoftwareOne: [14, 8], Insight: [10, 4], SHI: [16, 7] } as const;
    for (const [partner, [decided, signed]] of Object.entries(plan)) {
      const partnerRows = rows.filter((row) => row.partner === partner);
      const partnerDecided = partnerRows.filter((row) => row.outcome === "Hackathon decided" || row.outcome === "Pilot signed");
      const partnerSigned = partnerRows.filter((row) => row.outcome === "Pilot signed");
      const partnerBooked = partnerRows.filter((row) => row.outcome === "Hackathon booked" || row.outcome === "Hackathon decided" || row.outcome === "Pilot signed");
      expect(partnerDecided).toHaveLength(decided);
      expect(partnerSigned).toHaveLength(signed);
      expect(partnerSigned.length).toBeLessThanOrEqual(partnerDecided.length);
      expect(partnerDecided.length).toBeLessThanOrEqual(partnerBooked.length);
      expect(partnerBooked.length).toBeLessThanOrEqual(partnerRows.length);
      expect(partnerSigned.length).toBeGreaterThan(0);
      expect(partnerSigned.length).toBeLessThan(summary.pilotsSigned);
      expect(partnerDecided.every((row) => row.fundingClaimSubmitted)).toBe(true);
      expect(partnerBooked.some((row) => !row.fundingClaimSubmitted)).toBe(true);
    }
  });

  it("counts a signed pilot as proposed and booked, and a plain booking only as booked", () => {
    const base = buildTelemetrySessions()[0];
    const signed: TelemetrySession = { ...base, id: "signed", outcome: "Pilot signed" };
    const booked: TelemetrySession = { ...base, id: "booked", outcome: "Hackathon booked" };

    expect(summarizeTelemetry([signed])).toMatchObject({ hackathonsProposed: 1, hackathonsBooked: 1, pilotsSigned: 1 });
    expect(summarizeTelemetry([booked])).toMatchObject({ hackathonsProposed: 1, hackathonsBooked: 1, pilotsSigned: 0 });
  });

  it("reads Go as decided and a recorded sign-off as signed", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const booked = bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    const going = setPilotPick(booked, booked.hackathon!.solutionIds[0]);
    const stopped = recordNotGoingAhead(booked);
    expect(liveSessionOutcome(initialSessionGraph, true)).toBe("Hackathon proposed");
    expect(liveSessionOutcome(booked, true)).toBe("Hackathon booked");
    expect(liveSessionOutcome(going, true)).toBe("Hackathon decided");
    expect(liveSessionOutcome(stopped, true)).toBe("Hackathon decided");
    expect(liveSessionOutcome(markPilotSigned(going, "Ravi Menon"), true)).toBe("Pilot signed");
    expect(liveSessionOutcome(stopped, true)).not.toBe("Pilot signed");
  });

  it("selects recent rows that demonstrate the cohort instead of repeated filler", () => {
    const rows = scopeTelemetry(buildTelemetrySessions(), { actor: "partner", partnerName: "CDW" });
    const recent = recentTelemetryRows(rows, 8);

    expect(recent).toHaveLength(8);
    expect(recent.some((row) => row.mechanic === "ghost-ledger")).toBe(true);
    expect(recent.some((row) => row.delivery === "self-service")).toBe(true);
    expect(recent.some((row) => row.qualified && !row.converted)).toBe(true);
    expect(new Set(recent.map((row) => row.pattern)).size).toBeGreaterThan(1);
    expect(recent.filter((row) => row.delivery === "facilitated")).toHaveLength(4);
    expect(recent.filter((row) => row.delivery === "self-service")).toHaveLength(4);
    expect(recent.filter((row) => row.delivery === "self-service" && row.qualified).length).toBeGreaterThanOrEqual(3);
    expect(recent.some((row) => row.closeStyle === "board-slide")).toBe(true);
  });

  it("derives sample runs without changing booked or pilot counts", () => {
    const rows = buildTelemetrySessions();
    const again = buildTelemetrySessions();
    expect(rows.map((row) => row.sampleRun)).toEqual(again.map((row) => row.sampleRun));
    expect(rows.some((row) => row.sampleRun)).toBe(true);
    expect(rows.some((row) => !row.sampleRun)).toBe(true);

    const summary = summarizeTelemetry(rows);
    const flipped = rows.map((row) => ({ ...row, sampleRun: !row.sampleRun }));
    expect(summarizeTelemetry(flipped)).toEqual(summary);

    const booking = sampleRunBookingSummary(rows);
    expect(booking.ran).toBe(rows.filter((row) => row.sampleRun).length);
    expect(booking.bookedAfter).toBe(rows.filter((row) => row.sampleRun && (row.outcome === "Hackathon booked" || row.outcome === "Hackathon decided" || row.outcome === "Pilot signed")).length);
    expect(booking.bookedAfter).toBeLessThanOrEqual(booking.ran);
    expect(sampleRunColumnLabel(true)).toBe("Yes");
    expect(sampleRunColumnLabel(false)).toBe("—");
    expect(sampleRunBookingSummary([
      { sampleRun: true, outcome: "Pilot signed" },
      { sampleRun: true, outcome: "Run" },
      { sampleRun: false, outcome: "Hackathon booked" },
    ])).toEqual({ ran: 2, bookedAfter: 1 });
  });
});
