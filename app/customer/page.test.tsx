import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { sampleClaims } from "@/lib/sample-claims";
import { initialSessionGraph } from "@/lib/seed";
import {
  applyColdScope,
  applyDeliveryMode,
  bookHackathon,
  bookedSolutionTitles,
  chooseCustomerFormat,
  coldScopeDefaults,
  customerSampleRunLabel,
  lockRanking,
  markSampleClaim,
  rankedSolutions,
  recordHandoff,
  setPilotPick,
  startSampleRun,
  toggleSelected,
} from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import CustomerHomePage from "./page";

const customer = { actor: "customer", name: "Dana Reyes", org: "Heartland Mutual Insurance" };

function mockGraph(graph = initialSessionGraph, viewer = customer) {
  useSessionMock.mockReturnValue({
    graph,
    brand: brands.cdw,
    viewer,
    chooseCustomerFormat: vi.fn(),
  });
}

describe("customer home", () => {
  beforeEach(() => useSessionMock.mockReset());

  it("shows a customer on the partner-led Heartland session as attending, with no format cards", () => {
    mockGraph();
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("You are attending. The pain is already on the account.");
    expect(markup).toContain("Heartland Mutual Insurance");
    expect(markup).toContain("Constraints");
    expect(markup).toContain("Not yet handed off");
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain('href="/run"');
    expect(markup).not.toContain("How do you want to start?");
    expect(markup).not.toContain("Prioritize my use cases");
    expect(markup).not.toContain("Show me the cost of waiting");
    expect(markup).not.toContain("Prepare the DAF claim");
    expect(markup).not.toContain("File the pilot");
    expect(markup).not.toContain("Notify the PDM");
    expect(markup).not.toContain("Telemetry");
    expect(markup).toContain("View funding pack");
    expect(markup).toContain('href="/funding"');
    expect(markup).toContain("Book the hackathon first.");
    expect(markup).not.toContain("calendar.google.com");
    expect(markup).not.toContain("What the three days will be.");
    expect(markup).not.toContain("Apply for DAF");
    expect(markup).not.toContain("Partner network");
    expect(markup).not.toContain("Priya");
    expect(markup).not.toContain("Illustrative portfolio");
  });

  it("shows the format choice on a seeded partner-led session opened from the customer door", () => {
    mockGraph({
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, customerDoor: true },
    });
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("How do you want to start?");
    expect(markup).toContain("Prioritize my use cases");
    expect(markup).toContain("Show me the cost of waiting");
    expect(markup).not.toContain("You are attending.");
  });

  it("puts the three-day shape in the session summary once three are chosen", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph);
    mockGraph(selected);
    const markup = renderToStaticMarkup(<CustomerHomePage />);
    const summary = markup.slice(markup.indexOf("Your session"), markup.indexOf("Schedule a hackathon"));

    expect(summary).toContain("What the three days will be.");
    expect(summary.indexOf("What the three days will be.")).toBeLessThan(summary.indexOf("Start from the pain."));
    for (const solution of rankedSolutions(selected).filter((solution) => ids.includes(solution.id))) {
      expect(summary).toContain(solution.title);
    }
    expect(summary).toContain("Day 1.");
    expect(summary).toContain("Day 2.");
    expect(summary).toContain("Day 3.");
  });

  it("links the attending calendar only when the hackathon is booked", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const booked = bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Devin Cole",
      question: "Can we prove the three?",
    });
    mockGraph(booked);
    const markup = renderToStaticMarkup(<CustomerHomePage />);
    const href = markup.match(/href="(https:\/\/calendar\.google\.com[^"]+)"/)?.[1] ?? "";
    const decoded = decodeURIComponent(href.replace(/&amp;/g, "&").replace(/\+/g, "%20"));

    expect(markup).toContain("You are attending. The pain is already on the account.");
    expect(markup).toContain("What the three days will be.");
    expect(markup).toContain("Start from the pain.");
    expect(markup).toContain("Try it on your own documents.");
    expect(markup).toContain("Write down what held.");
    expect(markup).not.toContain("Which one becomes the pilot?");
    expect(markup).not.toContain("as the pilot");
    expect(markup).not.toContain(">Choose<");
    expect(markup).not.toContain("Chosen");
    expect(markup).not.toContain("What we built");
    const readout = markup.slice(markup.indexOf("What the three days will be."), markup.indexOf("Schedule a hackathon"));
    for (const title of bookedSolutionTitles(booked)) {
      expect(readout.indexOf(title)).toBeGreaterThanOrEqual(0);
      expect(readout.indexOf(title)).toBeLessThan(readout.indexOf("Start from the pain."));
    }
    expect(readout).toContain("Document AI");
    expect(readout).toContain("Vertex AI");
    expect(markup).toContain("Open calendar");
    expect(markup).toContain('href="/funding"');
    expect(decoded).toContain("20261014");
    expect(decoded).toContain("Partner: CDW");
    expect(markup).not.toContain("Book the hackathon first.");
    expect(markup).not.toContain("How do you want to start?");
    expect(booked.session.delivery).toBe("facilitated");
    expect(booked.session.customerDoor).not.toBe(true);
  });

  it("shows the recorded handoff to the attending customer without the controls", () => {
    mockGraph(recordHandoff(initialSessionGraph, "daf"));
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("DAF with the partner");
    expect(markup).not.toContain("Prepare the DAF claim");
  });

  it("keeps the format door for a self-service customer who has not started", () => {
    mockGraph(applyDeliveryMode(initialSessionGraph, "self-service"));
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("Session progress and funding for this engagement only.");
    expect(markup).toContain("How do you want to start?");
    expect(markup).toContain("Prioritize my use cases");
    expect(markup).toContain("Show me the cost of waiting");
    expect(markup).toContain("No account yet");
    expect(markup).toContain("Not started");
    expect(markup).toContain("Not yet handed off");
    expect(markup).not.toContain("You are attending.");
    expect(markup).not.toContain("Prepare the DAF claim");
  });

  it("keeps the format door for a customer on a cold account", () => {
    mockGraph(applyColdScope(initialSessionGraph, coldScopeDefaults.company, coldScopeDefaults.attendees));
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("How do you want to start?");
    expect(markup).not.toContain("You are attending.");
  });

  it("shows the started session and routes Continue to Scope until a step is active", () => {
    const started = chooseCustomerFormat(initialSessionGraph, "ghost-ledger");
    mockGraph(started);
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("Show me the cost of waiting");
    expect(markup).toContain("Partner of record");
    expect(markup).toContain("CDW");
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain("How do you want to start?");
    expect(markup).not.toContain("Annual value");
  });

  it("hides the annual value on a cold account with incomplete inputs", () => {
    const cold = applyColdScope(
      chooseCustomerFormat(initialSessionGraph, "value-sprint"),
      { name: "Reply", industry: "Insurance", sizeBand: "$500M–$1B" },
      coldScopeDefaults.attendees,
    );
    mockGraph(cold);
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("Reply");
    expect(markup).toContain("Where it hurts");
    expect(markup).toContain('href="/run"');
    expect(markup).not.toContain("Annual value");
    expect(markup).not.toContain("$7,750,000");
    expect(markup).toContain("Funding pack");
    expect(markup).toContain("Your partner prepares the DAF claim from this business case.");
    expect(markup).toContain("View funding pack");
    expect(markup).not.toContain("Apply for DAF");
  });

  it("links the schedule card to a compose URL carrying date, partner, and titles once booked", () => {
    const account = applyColdScope(
      initialSessionGraph,
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      coldScopeDefaults.attendees,
    );
    const ids = rankedSolutions(account).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), account);
    const booked = bookHackathon(selected, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Devin Cole",
      question: "Can we prove the three?",
    });
    mockGraph(booked);
    const markup = renderToStaticMarkup(<CustomerHomePage />);
    const href = markup.match(/href="(https:\/\/calendar\.google\.com[^"]+)"/)?.[1] ?? "";
    const decoded = decodeURIComponent(href.replace(/&amp;/g, "&").replace(/\+/g, "%20"));

    expect(markup).toContain("What the three days will be.");
    expect(markup).toContain("Start from the pain.");
    expect(markup).toContain("Day 1.");
    expect(markup).toContain("Day 2.");
    expect(markup).toContain("Day 3.");
    expect(markup).not.toContain("Which one becomes the pilot?");
    expect(markup).not.toContain("as the pilot");
    expect(markup).not.toContain(">Choose<");
    expect(markup).not.toContain("Chosen");
    expect(markup).not.toContain("What we built");
    expect(markup).not.toContain('aria-disabled="true"');
    expect(decoded).toContain("20261014");
    expect(decoded).toContain("Partner: CDW");
    for (const title of bookedSolutionTitles(booked)) {
      expect(decoded).toContain(title);
    }
  });

  it("reads Pilot scoped once the room has picked, with no purchase language", () => {
    const account = applyColdScope(
      chooseCustomerFormat(initialSessionGraph, "value-sprint"),
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      coldScopeDefaults.attendees,
    );
    const ids = rankedSolutions(account).map((solution) => solution.id).slice(0, 3);
    const booked = bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), account), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Devin Cole",
      question: "Can we prove the three?",
    });
    mockGraph(booked);
    const before = renderToStaticMarkup(<CustomerHomePage />);
    expect(before).not.toContain("Pilot scoped");
    expect(decodeURIComponent(before.replace(/\+/g, "%20"))).toContain("Showcase: 2026-10-16T14:00");

    mockGraph(setPilotPick(booked, booked.hackathon!.solutionIds[0]));
    const after = renderToStaticMarkup(<CustomerHomePage />);
    expect(after).toContain("Pilot scoped");
    expect(after).not.toMatch(/\b(buy|purchase)\b/i);
    expect(after).not.toContain("Apply for DAF");
  });

  it("points partner and PDM viewers back to the dashboard", () => {
    mockGraph(initialSessionGraph, { actor: "partner", name: "Ravi Menon", org: "CDW" });
    const markup = renderToStaticMarkup(<CustomerHomePage />);
    expect(markup).toContain("Back to dashboard");
    expect(markup).not.toContain("Prioritize my use cases");
    expect(markup).not.toContain("What the three days will be.");

    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const booked = bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    mockGraph(booked, { actor: "partner", name: "Ravi Menon", org: "CDW" });
    expect(renderToStaticMarkup(<CustomerHomePage />)).not.toContain("What the three days will be.");
    mockGraph(booked, { actor: "pdm", name: "Priya Raghavan", org: "Google" });
    expect(renderToStaticMarkup(<CustomerHomePage />)).not.toContain("Start from the pain.");
  });

  it("adds a sample run row for the customer once the extraction solution is locked", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const locked = lockRanking(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph));
    mockGraph(locked);
    const notRun = renderToStaticMarkup(<CustomerHomePage />);
    expect(notRun).toContain("Sample run");
    expect(notRun).toContain("Not run yet");
    expect(notRun).toContain('href="/try"');
    expect(customerSampleRunLabel(locked)).toBe("Not run yet");

    const started = startSampleRun(locked, "partner", "Ravi Menon", "2026-10-01T00:00:00.000Z");
    mockGraph(started);
    expect(renderToStaticMarkup(<CustomerHomePage />)).toContain("Reviewed 0 of 8");

    const partial = markSampleClaim(started, "partner", sampleClaims[0].id, "right", [], "Ravi Menon", "2026-10-01T00:00:00.000Z", true);
    mockGraph(partial);
    expect(renderToStaticMarkup(<CustomerHomePage />)).toContain("Reviewed 1 of 8");

    let reviewed = partial;
    for (const claim of sampleClaims) {
      reviewed = markSampleClaim(reviewed, "partner", claim.id, "right", [], "Ravi Menon", "2026-10-01T00:00:00.000Z", true);
    }
    mockGraph(reviewed);
    expect(renderToStaticMarkup(<CustomerHomePage />)).toContain("Reviewed 8 of 8 · 0 need a fix");

    mockGraph(locked, { actor: "partner", name: "Ravi Menon", org: "CDW" });
    expect(renderToStaticMarkup(<CustomerHomePage />)).not.toContain("Sample run");
  });
});
