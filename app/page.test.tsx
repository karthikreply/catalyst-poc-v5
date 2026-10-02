// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { bookHackathon, rankedSolutions, recordHandoff, setPilotPick, toggleSelected } from "@/lib/session";

const useSessionMock = vi.fn();
const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import Home from "./page";

function sessionFor(actor: string, hydrated: boolean, graph = initialSessionGraph) {
  useSessionMock.mockReturnValue({
    viewer: {
      actor,
      name: actor === "customer" ? "Dana Reyes" : actor === "pdm" ? "Priya Raghavan" : "Ravi Menon",
      org: "Org",
    },
    brand: brands.cdw,
    setActor: vi.fn(),
    setFocus: vi.fn(),
    hydrated,
    graph,
  });
}

function bookThree() {
  const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
  return bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph), {
    date: "2026-10-14",
    googleFacilitator: "Priya Raghavan",
    partnerSpecialist: "Ravi Menon",
    customerOwner: "Dana Reyes",
    question: "Can we prove the three?",
  });
}

describe("program dashboard", () => {
  beforeEach(() => replace.mockReset());

  it("sends a customer home, and to the hackathon when that is the focus", () => {
    sessionFor("customer", true);
    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/customer");

    replace.mockClear();
    sessionFor("customer", true, {
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, focus: "hackathon" },
    });
    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/hackathon");
  });

  it("renders no portfolio for the customer redirect", () => {
    sessionFor("customer", true);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).not.toContain("Partner network");
    expect(markup).not.toContain("Priya");
    expect(markup).not.toContain("Illustrative portfolio");
    expect(markup).not.toContain("Telemetry");
    expect(markup).not.toContain("Funding");
  });

  it("shows the PDM portfolio and the live session, without the entry doors or the focus switch", () => {
    sessionFor("pdm", true);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Illustrative portfolio");
    expect(markup).toContain("125");
    expect(markup).toContain("56");
    expect(markup).toContain("26");
    expect(markup).toContain("$5.0M");
    expect(markup).toContain("$5.5M");
    expect(markup).toContain("CDW");
    expect(markup).toContain("SoftwareOne");
    expect(markup).toContain("Insight");
    expect(markup).toContain("SHI");
    expect(markup).toContain("Insight is the quiet partner.");
    expect(markup).toContain("Live session");
    expect(markup).toContain("Heartland Mutual Insurance");
    expect(markup).toContain("Not booked");
    expect(markup).toContain('href="/scope"');
    expect(markup).toContain("Review funding request");
    expect(markup).toContain('href="/funding"');
    expect(markup).toContain("View the rows");
    expect(markup).toContain('href="/telemetry"');
    expect(markup).not.toContain("Three doors");
    expect(markup).not.toContain(">Session</button>");
    expect(markup).not.toContain(">Hackathon</button>");
    expect(markup).not.toContain("AI-assisted claims intake extraction");
  });

  it("changes the live card when the hackathon is booked and leaves the portfolio headlines fixed", () => {
    const booked = bookThree();
    sessionFor("pdm", true, booked);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Booked");
    expect(markup).toContain("2026-10-14");
    for (const id of booked.hackathon!.solutionIds) {
      const title = initialSessionGraph.solutions.find((solution) => solution.id === id)?.title;
      expect(markup).toContain(title!);
    }
    expect(markup).not.toContain("Pilot signed");
    expect(markup).toContain("125");
    expect(markup).toContain("56");
    expect(markup).toContain("26");
    expect(markup).toContain("$5.0M");
    expect(markup).toContain("$5.5M");

    sessionFor("pdm", true, setPilotPick(booked, booked.hackathon!.solutionIds[0]));
    const signed = renderToStaticMarkup(<Home />);
    expect(signed).toContain("Pilot signed");
    expect(signed).toContain("$5.0M");
    expect(signed).toContain("$5.5M");
  });

  it("keeps the partner on his session, funding, and telemetry", () => {
    sessionFor("partner", true);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Funding");
    expect(markup).toContain("Telemetry");
    expect(markup).toContain('href="/telemetry"');
    expect(markup).toContain("Handoff");
    expect(markup).toContain("Not yet handed off");
    expect(markup).not.toContain("Illustrative portfolio");
    expect(markup).not.toContain("Insight");
    expect(markup).not.toContain("Programs");
    expect(markup).not.toContain("Support");
    expect(markup).not.toContain("Three doors");
  });

  it("shows the handoff strip to the partner without the controls", () => {
    sessionFor("partner", true, recordHandoff(initialSessionGraph, "pdm-notified"));
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("PDM notified");
    expect(markup).toContain("Alex Chen");
    expect(markup).not.toContain("Prepare the DAF claim");
  });

  it("renders nothing before the stored viewer is known", () => {
    sessionFor("partner", false);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).not.toContain("Telemetry");
    expect(markup).not.toContain("Funding");
    expect(markup).not.toContain("Illustrative portfolio");
  });
});
