import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { applyColdScope, coldScopeDefaults, earliestIncompleteStep, hackathonGuardCopy } from "@/lib/session";

const state = vi.hoisted(() => ({ pathname: "/plan" }));
const useSessionMock = vi.fn();

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("./session-provider", () => ({ useSession: () => useSessionMock() }));

import { BrandFlowFrame } from "./brand-flow-frame";

function frame(actor: string, graph = initialSessionGraph) {
  useSessionMock.mockReturnValue({
    graph,
    brand: brands.cdw,
    brandId: "cdw",
    setBrandId: vi.fn(),
    setMechanic: vi.fn(),
    setFocus: vi.fn(),
    canEditSession: true,
    viewer: { actor, name: "Someone", org: "Org" },
  });
  return renderToStaticMarkup(<BrandFlowFrame><p>body</p></BrandFlowFrame>);
}

describe("customer chrome", () => {
  it("names the partner of record and hides the brand switcher", () => {
    state.pathname = "/plan";
    const markup = frame("customer");
    expect(markup).toContain("CDW");
    expect(markup).toContain("Your engagement");
    expect(markup).not.toContain("Partner brand");
    expect(markup).not.toContain("aria-haspopup");
    expect(markup).not.toContain("Heartland");
  });

  it("puts the chosen format under the account once the customer has one", () => {
    state.pathname = "/run";
    const account = applyColdScope(
      initialSessionGraph,
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      coldScopeDefaults.attendees,
    );
    const markup = frame("customer", account);
    expect(markup).toContain("Reply · value session");
    expect(markup).toContain("Prioritize my use cases");
    expect(markup).not.toContain("Partner-facilitated");
    expect(markup).not.toContain(">Format<");
    expect(markup).not.toContain("Next: Rank");
  });

  it("keeps the facilitation line without a brand switcher", () => {
    state.pathname = "/run";
    const markup = frame("partner");
    expect(markup).not.toContain("aria-haspopup");
    expect(markup).not.toContain("Partner brand");
    expect(markup).toContain("Facilitated by");
    expect(markup).toContain("Heartland Mutual Insurance · value session");
    expect(markup).toContain(">Format<");
    expect(markup).toContain("Next: Rank");
  });

  it("puts the partner mark above one Session and Hackathon control", () => {
    state.pathname = "/scope";
    const graph = {
      ...initialSessionGraph,
      ranking: { ...initialSessionGraph.ranking, selected: ["a", "b", "c"] },
    };
    const markup = frame("partner", graph);
    expect(markup.match(/<button[^>]*>Session<\/button>/g)).toHaveLength(1);
    expect(markup.match(/<button[^>]*>Hackathon<\/button>/g)).toHaveLength(1);
    expect(markup.indexOf(">CDW<")).toBeLessThan(markup.indexOf(">Session</button>"));
  });

  it("shows the hackathon guard before a shortlist and does not open a Heartland account", () => {
    state.pathname = "/hackathon";
    const graph = {
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, focus: "hackathon" as const, customerName: "Reply" },
    };
    const markup = frame("partner", graph);
    const step = earliestIncompleteStep(graph);
    expect(markup).toContain(hackathonGuardCopy);
    expect(markup).toContain(`href="${step.href}"`);
    expect(markup).toContain(step.label);
    expect(markup).not.toContain("Heartland");
    expect(markup).not.toMatch(/<button[^>]*>Hackathon<\/button>/);
  });
});
