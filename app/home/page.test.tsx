// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { awaitingReviewCount, fundingRequestsForPdm } from "@/lib/funding-book";
import { fewestSignedLine, formatPortfolioMoney, fundRatio, portfolio, portfolioSummary } from "@/lib/pdm-portfolio";
import { initialSessionGraph } from "@/lib/seed";
import { bookHackathon, rankedSolutions, recordHandoff, setPilotPick, submitFundingClaim, toggleSelected } from "@/lib/session";

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
    expect(markup).not.toContain("Hackathons booked by quarter");
    expect(markup).not.toContain("Telemetry");
    expect(markup).not.toContain("Funding");
  });

  it("shows the PDM portfolio and the live session, without the entry doors or the focus switch", () => {
    sessionFor("pdm", true);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Illustrative portfolio");
    expect(markup).toContain(portfolioSummary());
    expect(markup).toContain(fewestSignedLine());
    expect(markup).toContain("Partner names and figures are placeholders.");
    expect(markup).toContain(String(portfolio.headlines.sessions));
    expect(markup).toContain(formatPortfolioMoney(portfolio.headlines.fundApproved));
    expect(markup).toContain(formatPortfolioMoney(portfolio.headlines.signedPilotValue));
    expect(markup).toContain(`About ${fundRatio()} to 1`);
    expect(markup).not.toContain("$5.0M");
    expect(markup).not.toContain("$5.5M");
    expect(markup).toContain("CDW");
    expect(markup).toContain("SoftwareOne");
    expect(markup).toContain("Insight");
    expect(markup).toContain("SHI");
    expect(markup).toContain("Where the book drops");
    expect(markup).toContain("Partners");
    expect(markup).toContain("Money");
    expect(markup).toContain("Hackathons booked by quarter");
    expect(markup).toContain("Q3 2026");
    expect(markup).toContain("Needs your attention");
    expect(markup).toContain(`${awaitingReviewCount(fundingRequestsForPdm(initialSessionGraph, "CDW"))} funding requests awaiting review`);
    expect(markup).toContain("returned for evidence");
    expect(markup).toContain("Review funding requests");
    expect(markup).toContain("View telemetry");
    expect(markup).not.toContain('href="/scope"');
    expect(markup).toContain(fewestSignedLine());
    expect(markup).toContain('href="/funding"');
    expect(markup).toContain('href="/telemetry"');
    expect(markup).not.toContain("Live session");
    expect(markup).not.toContain("Heartland Mutual Insurance");
    expect(markup).not.toContain("Open the session");
    expect(markup).not.toContain('href="/scope"');
    expect(markup).not.toContain('href="/run"');
    expect(markup).not.toContain('href="/sessions"');
    expect(markup).not.toContain("View the rows");
    expect(markup).not.toContain("Three doors");
    expect(markup).not.toContain(">Session</button>");
    expect(markup).not.toContain(">Hackathon</button>");
    expect(markup).not.toContain("AI-assisted claims intake extraction");
  });

  it("keeps the portfolio fixed and the session off the PDM home whatever the live session does", () => {
    const booked = bookThree();
    sessionFor("pdm", true, booked);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).not.toContain("2026-10-14");
    for (const id of booked.hackathon!.solutionIds) {
      const title = initialSessionGraph.solutions.find((solution) => solution.id === id)?.title;
      expect(markup).not.toContain(title!);
    }
    expect(markup).toContain(portfolioSummary());
    expect(markup).toContain(formatPortfolioMoney(portfolio.headlines.fundApproved));
    expect(markup).toContain("Hackathons booked by quarter");
    expect(markup).toContain("Q3 2026");

    sessionFor("pdm", true, setPilotPick(booked, booked.hackathon!.solutionIds[0]));
    const signed = renderToStaticMarkup(<Home />);
    expect(signed).not.toContain("Pilot signed");
    expect(signed).toContain(formatPortfolioMoney(portfolio.headlines.fundApproved));
  });

  it("counts the Heartland claim once the partner has submitted it", () => {
    const submitted = submitFundingClaim(bookThree(), "Ravi Menon");
    sessionFor("pdm", true, submitted);
    const markup = renderToStaticMarkup(<Home />);
    const requests = fundingRequestsForPdm(submitted, "CDW");
    expect(markup).toContain(`${awaitingReviewCount(requests)} funding requests awaiting review`);
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
    expect(markup).not.toContain("Hackathons booked by quarter");
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
