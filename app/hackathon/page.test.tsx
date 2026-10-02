import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { initialSessionGraph } from "@/lib/seed";
import { applyDeliveryMode, hackathonGuardCopy, toggleSelected, rankedSolutions } from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import HackathonPage from "./page";

const viewers = {
  partner: { actor: "partner", name: "Ravi Menon", org: "CDW" },
  customer: { actor: "customer", name: "Dana Reyes", org: "Heartland Mutual Insurance" },
  pdm: { actor: "pdm", name: "Priya Raghavan", org: "Google" },
} as const;

function renderFor(actor: keyof typeof viewers, graph = initialSessionGraph) {
  useSessionMock.mockReturnValue({
    graph,
    brand: { partnerName: "CDW", accent: "#000" },
    viewer: viewers[actor],
    bookHackathon: vi.fn(),
    toggleSelected: vi.fn(),
    setPilotPick: vi.fn(),
    recordNotGoingAhead: vi.fn(),
    markPilotSigned: vi.fn(),
  });
  return renderToStaticMarkup(<HackathonPage />);
}

describe("hackathon guard", () => {
  it.each(["partner", "customer", "pdm"] as const)("tells %s to run a value session first and does not open the Heartland record", (actor) => {
    const empty = {
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, customerName: "", scopeMode: "cold" as const, focus: "hackathon" as const },
      agenda: initialSessionGraph.agenda.map((step) => ({ ...step, state: "upcoming" as const })),
      solutions: [],
    };
    const markup = renderFor(actor, empty);
    expect(markup).toContain(hackathonGuardCopy);
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain("Heartland");
    expect(markup).not.toContain("Book the hackathon");
  });

  it("shows the booking date once the solution is chosen", () => {
    const ids = rankedSolutions(applyDeliveryMode(initialSessionGraph, "self-service")).map((solution) => solution.id).slice(0, 3);
    const chosen = ids.reduce((current, id) => toggleSelected(current, id), applyDeliveryMode(initialSessionGraph, "self-service"));
    const markup = renderFor("customer", chosen);
    expect(markup).not.toContain(hackathonGuardCopy);
    expect(markup).toContain("Hackathon date");
    expect(markup).toContain('type="date"');
  });
});

describe("hackathon solutions", () => {
  const selfService = applyDeliveryMode(initialSessionGraph, "self-service");
  const ids = rankedSolutions(selfService).map((solution) => solution.id);
  const titleOf = (id: string) => initialSessionGraph.solutions.find((solution) => solution.id === id)!.title;

  it("lists only the chosen solutions, not the whole catalog", () => {
    const chosen = ids.slice(0, 3).reduce((current, id) => toggleSelected(current, id), selfService);
    const markup = renderFor("customer", chosen);
    for (const id of ids.slice(0, 3)) expect(markup).toContain(titleOf(id));
    const others = initialSessionGraph.solutions.filter((solution) => !ids.slice(0, 3).includes(solution.id));
    expect(others.length).toBeGreaterThan(0);
    for (const solution of others) expect(markup).not.toContain(solution.title);
    expect(markup).toContain("Book the hackathon");
    expect(markup).not.toContain("What the three days will be.");
    expect(markup).not.toContain("Start from the pain.");
  });

  it("opens the calendar in a new tab and links on to the business case once booked", async () => {
    const { bookHackathon } = await import("@/lib/session");
    const chosen = ids.slice(0, 3).reduce((current, id) => toggleSelected(current, id), selfService);
    const booked = bookHackathon(chosen, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove extraction?",
    });
    const markup = renderFor("customer", booked);
    expect(markup).toMatch(/<a href="https:\/\/calendar\.google\.com[^"]*" target="_blank" rel="noopener noreferrer"/);
    expect(markup).toContain('id="hackathon-calendar"');
    expect(markup).toContain("Next: the business case");
    expect(markup).toContain('href="/artifact"');
  });
});
