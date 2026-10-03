// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { fundingBook, fundingListPageSize } from "@/lib/funding-book";
import { initialSessionGraph } from "@/lib/seed";
import { applyClaimsVolumeChoice, applyExactClaimsVolume, bookHackathon, rankedSolutions, submitFundingClaim, toggleSelected } from "@/lib/session";

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: useSessionMock,
}));

import FundingPage from "./page";

function bookedGraph() {
  return bookHackathon(
    rankedSolutions(initialSessionGraph).slice(0, 3).reduce((current, solution) => toggleSelected(current, solution.id), initialSessionGraph),
    { date: "2026-10-14", googleFacilitator: "Priya Raghavan", partnerSpecialist: "Ravi Menon", customerOwner: "Dana Reyes", question: "Can we prove the three?" },
  );
}

function sessionFor(actor: string, graph = initialSessionGraph, submit = vi.fn(), withdraw = vi.fn()) {
  useSessionMock.mockReturnValue({
    graph,
    brand: brands.cdw,
    viewer: { actor, name: actor === "pdm" ? "Priya Raghavan" : actor === "partner" ? "Ravi Menon" : "Dana Reyes", org: "Org" },
    submitFundingClaim: submit,
    withdrawFundingClaim: withdraw,
  });
  return { submit, withdraw };
}

describe("exact claims provenance", () => {
  it("carries partner-entered provenance into the funding request", () => {
    const graph = applyExactClaimsVolume(
      applyClaimsVolumeChoice(initialSessionGraph, "exact"),
      275,
    );
    sessionFor("partner", graph);

    const markup = renderToStaticMarkup(<FundingPage />);

    expect(markup).toContain(
      "Volume entered by partner in Scope · not respondent-confirmed",
    );
  });

  it("withholds the seeded case from a customer who has no account", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.cdw,
      viewer: { actor: "customer", name: "Dana Reyes", org: "Platform vendor" },
    });

    const markup = renderToStaticMarkup(<FundingPage />);
    expect(markup).toContain("This is written once your account is in the session.");
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain("Heartland");
    expect(markup).not.toContain("Start DAF funding request");
  });
});

describe("partner submission", () => {
  afterEach(cleanup);

  it("stays a draft until the hackathon is booked, then records a demo-only submission", () => {
    sessionFor("partner");
    const blocked = render(<FundingPage />);
    expect(blocked.getByRole("button", { name: "Submit funding claim" }).hasAttribute("disabled")).toBe(true);
    expect(blocked.container.textContent).toContain("Book the hackathon first.");
    expect(blocked.container.textContent).not.toContain("filed");
    blocked.unmount();

    const { submit } = sessionFor("partner", bookedGraph());
    const view = render(<FundingPage />);
    expect(view.getByRole("button", { name: "Submit funding claim" }).hasAttribute("disabled")).toBe(false);
    fireEvent.click(view.getByRole("button", { name: "Submit funding claim" }));
    expect(submit).toHaveBeenCalledTimes(1);
    view.unmount();

    const recorded = sessionFor("partner", submitFundingClaim(bookedGraph(), "Ravi Menon"));
    const markup = render(<FundingPage />);
    expect(markup.container.textContent).toContain("Submitted · demo only");
    expect(markup.container.textContent).toContain("Recorded in this demo only. Nothing was sent.");
    expect(markup.container.textContent).not.toContain("filed");
    expect(markup.container.textContent).not.toContain("awaiting review");
    fireEvent.click(markup.getByRole("button", { name: "Withdraw" }));
    expect(recorded.withdraw).toHaveBeenCalledTimes(1);
  });
});

describe("PDM funding requests", () => {
  afterEach(cleanup);

  it("lists the book across the four partners with no session links", () => {
    sessionFor("pdm");
    const markup = renderToStaticMarkup(<FundingPage />);
    expect(markup).toContain("Funding requests");
    expect(markup).toContain("$1.4M across 56 claims");
    expect(markup).toContain(`Showing ${fundingListPageSize} of ${fundingBook.length}`);
    for (const partner of ["CDW", "SoftwareOne", "Insight", "SHI"]) expect(markup).toContain(partner);
    expect(markup).not.toContain("Softchoice");
    expect(markup).not.toContain("Heartland");
    expect(markup).not.toContain("Back to business case");
    expect(markup).not.toContain('href="/artifact"');
    expect(markup).not.toContain('href="/scope"');
    expect(markup).not.toContain('href="/run"');
    expect(markup).not.toContain('href="/pilot-spec"');
    expect((markup.match(/Awaiting review/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("shows all rows on request and expands a row to its evidence", () => {
    sessionFor("pdm");
    const view = render(<FundingPage />);
    fireEvent.click(view.getByRole("button", { name: /Show all/ }));
    expect(view.container.textContent).toContain(`Showing ${fundingBook.length} of ${fundingBook.length}`);

    const first = fundingBook[0];
    expect(view.container.textContent).not.toContain(first.evidence.valueBasis);
    fireEvent.click(view.getAllByRole("button", { name: /Evidence/ })[0]);
    expect(view.container.textContent).toContain(first.evidence.valueBasis);
    expect(view.container.textContent).toContain("Hackathon booked");
  });

  it("adds the Heartland claim after the partner submits, and opens the existing pack from it", () => {
    sessionFor("pdm", submitFundingClaim(bookedGraph(), "Ravi Menon"));
    const view = render(<FundingPage />);
    expect(view.container.textContent).toContain("Heartland Mutual Insurance");
    expect(view.container.textContent).toContain(`Showing ${fundingListPageSize} of ${fundingBook.length + 1}`);

    fireEvent.click(view.getAllByRole("button", { name: /Evidence/ })[0]);
    fireEvent.click(view.getByRole("button", { name: /Open the pack/ }));
    expect(view.container.textContent).toContain("DAF substantiation pack");
    expect(view.container.textContent).toContain("Submitted · demo only");
    expect(view.container.textContent).toContain("Michelle Dorsey");
    expect(view.container.innerHTML).not.toContain('href="/artifact"');

    fireEvent.click(view.getByRole("button", { name: /Back to funding requests/ }));
    expect(view.container.textContent).toContain("Funding requests");
  });
});
