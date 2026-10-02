import { describe, expect, it } from "vitest";

import { initialSessionGraph, type SessionGraph } from "./seed";
import {
  applyDeliveryMode,
  bookBlockReason,
  bookHackathon,
  hydrateSessionGraph,
  markPilotSigned,
  rankedSolutions,
  recordNotGoingAhead,
  sessionReachedShortlist,
  setPilotPick,
  setSessionFocus,
  toggleSelected,
  hackathonGuardCopy,
} from "./session";
import { buildTelemetrySessions, liveSessionOutcome, summarizeTelemetry } from "./telemetry";

function selectThree(graph: SessionGraph = initialSessionGraph) {
  const ids = rankedSolutions(graph).map((solution) => solution.id).slice(0, 3);
  return ids.reduce((current, id) => toggleSelected(current, id), graph);
}

const draft = {
  date: "2026-10-14",
  googleFacilitator: "Priya Raghavan",
  partnerSpecialist: "Ravi Menon",
  customerOwner: "Dana Reyes",
  question: "Can we prove the three?",
};

describe("hackathon focus", () => {
  it("keeps three solution ids through hydration", () => {
    const booked = bookHackathon(selectThree(), draft);
    expect(booked.hackathon?.solutionIds).toHaveLength(3);
    const stored = {
      ...booked,
      ranking: { ...booked.ranking, selected: booked.hackathon!.solutionIds },
    };
    const loaded = hydrateSessionGraph(JSON.parse(JSON.stringify(stored)) as SessionGraph);
    expect(loaded.ranking.selected).toEqual(booked.hackathon!.solutionIds);
    expect(loaded.hackathon?.solutionIds).toEqual(booked.hackathon!.solutionIds);
    expect(loaded.session.focus).toBe("session");
  });

  it("confirms on the third selection for self-service and waits for the partner when facilitated", () => {
    const selfService = applyDeliveryMode(initialSessionGraph, "self-service");
    const ids = rankedSolutions(selfService).map((solution) => solution.id);
    const two = [ids[0], ids[1]].reduce((current, id) => toggleSelected(current, id), selfService);
    expect(two.ranking.locked).toBe(false);
    const three = toggleSelected(two, ids[2]);
    expect(three.ranking.selected).toEqual(ids.slice(0, 3));
    expect(three.ranking.locked).toBe(true);

    const facilitated = selectThree(initialSessionGraph);
    expect(facilitated.session.delivery).toBe("facilitated");
    expect(facilitated.ranking.locked).toBe(false);
    expect(facilitated.ranking.selected).toHaveLength(3);
  });

  it("returns the first book reason for the role and the shortlist state", () => {
    expect(bookBlockReason("pdm", selectThree())).toBeNull();
    expect(bookBlockReason("partner", initialSessionGraph)).toBe("Choose three first.");
    expect(bookBlockReason("customer", selectThree())).toBeNull();
    const confirmed = selectThree();
    const locked = { ...confirmed, ranking: { ...confirmed.ranking, locked: true } };
    expect(bookBlockReason("partner", locked)).toBeNull();
    const selfService = applyDeliveryMode(initialSessionGraph, "self-service");
    const chosen = selectThree(selfService);
    expect(bookBlockReason("customer", chosen)).toBeNull();
  });

  it("leaves the booking and the pilot pick in place when focus changes", () => {
    const booked = bookHackathon(selectThree(), draft);
    const going = setPilotPick(booked, booked.hackathon!.solutionIds[0]);
    const focused = setSessionFocus(going, "hackathon");
    expect(focused.session.focus).toBe("hackathon");
    expect(focused.hackathon?.solutionIds).toEqual(going.hackathon?.solutionIds);
    expect(focused.hackathon?.date).toBe(going.hackathon?.date);
    expect(focused.outcome.pilotPick).toBe(going.outcome.pilotPick);
    expect(setSessionFocus(focused, "hackathon")).toBe(focused);
  });

  it("leaves the booking and the pilot pick unchanged when focus changes", () => {
    const booked = bookHackathon(selectThree(), draft);
    const going = setPilotPick(booked, booked.hackathon!.solutionIds[0]);
    const focused = setSessionFocus(going, "hackathon");
    expect(focused.session.focus).toBe("hackathon");
    expect(focused.hackathon?.solutionIds).toEqual(going.hackathon?.solutionIds);
    expect(focused.hackathon?.date).toBe(going.hackathon?.date);
    expect(focused.outcome.pilotPick).toBe(going.outcome.pilotPick);
    expect(setSessionFocus(focused, "session").hackathon).toEqual(focused.hackathon);
  });

  it("keeps the solution, the date, and the pilot status when focus or role changes", () => {
    const booked = bookHackathon(selectThree(), draft);
    const going = setPilotPick(booked, booked.hackathon!.solutionIds[0]);
    const focused = { ...going, session: { ...going.session, focus: "hackathon" as const } };
    expect(focused.hackathon?.solutionIds).toEqual(going.hackathon?.solutionIds);
    expect(focused.hackathon?.date).toBe(going.hackathon?.date);
    expect(focused.outcome.pilotPick).toBe(going.outcome.pilotPick);
    expect(focused.outcome.hackathonDecision).toBe("go");
    const asCustomer = { ...focused, session: { ...focused.session, customerDoor: true } };
    expect(asCustomer.hackathon).toEqual(focused.hackathon);
    expect(asCustomer.outcome.pilotPick).toBe(focused.outcome.pilotPick);
    expect(asCustomer.session.pilotSigned).toBe(focused.session.pilotSigned);
  });

  it("does not treat not going ahead as a signed pilot", () => {
    const booked = bookHackathon(selectThree(), draft);
    const stopped = recordNotGoingAhead(booked);
    expect(stopped.outcome.pilotPick).toBeNull();
    expect(stopped.outcome.hackathonDecision).toBe("not-going-ahead");
    expect(liveSessionOutcome(stopped, true)).toBe("Hackathon decided");
    expect(markPilotSigned(stopped, "Ravi Menon").session.pilotSigned).toBeNull();
    const signed = markPilotSigned(setPilotPick(booked, booked.hackathon!.solutionIds[0]), "Ravi Menon");
    expect(signed.session.pilotSigned?.recordedBy).toBe("Ravi Menon");
    expect(liveSessionOutcome(signed, true)).toBe("Pilot signed");
  });

  it("never lets a later telemetry stage outgrow the one before it", () => {
    const rows = buildTelemetrySessions();
    const summary = summarizeTelemetry(rows);
    expect(summary.hackathonsDecided).toBeLessThanOrEqual(summary.hackathonsBooked);
    expect(summary.pilotsSigned).toBeLessThanOrEqual(summary.hackathonsDecided);
    expect(summary.pilotsSigned).toBeLessThan(summary.hackathonsDecided);
    expect(summary.hackathonsDecided).toBeLessThan(summary.hackathonsBooked);
  });

  it("opens booking once the solution is chosen, even if the run is still open", () => {
    const chosen = selectThree(applyDeliveryMode(initialSessionGraph, "self-service"));
    expect(chosen.agenda.every((step) => step.state === "done")).toBe(false);
    expect(chosen.ranking.selected).toHaveLength(3);
    expect(sessionReachedShortlist(chosen)).toBe(true);
    expect(bookBlockReason("customer", chosen)).toBeNull();
  });

  it("guards a session that has not reached the shortlist", () => {
    expect(sessionReachedShortlist(initialSessionGraph)).toBe(false);
    expect(hackathonGuardCopy).toBe("A hackathon follows a value session. Run one first.");
    const empty = {
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, customerName: "", scopeMode: "cold" as const },
      agenda: initialSessionGraph.agenda.map((step) => ({ ...step, state: "upcoming" as const })),
    };
    expect(sessionReachedShortlist(empty)).toBe(false);
    expect(empty.session.customerName).not.toContain("Heartland");
  });
});
