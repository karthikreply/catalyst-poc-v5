// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";

const useSessionMock = vi.fn();
const push = vi.hoisted(() => vi.fn());
const nav = vi.hoisted(() => ({ pathname: "/home" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push }),
}));
vi.mock("./session-provider", () => ({ useSession: () => useSessionMock() }));

import { AppShell } from "./app-shell";

function sessionFor(actor: string, setActor = vi.fn()) {
  useSessionMock.mockReturnValue({
    graph: initialSessionGraph,
    brand: brands.cdw,
    viewer: { actor, name: "Someone", org: "Org" },
    setActor,
    hydrated: true,
  });
  return setActor;
}

function shellMarkup(actor: string) {
  sessionFor(actor);
  return renderToStaticMarkup(<AppShell><p>body</p></AppShell>);
}

describe("app shell navigation", () => {
  beforeEach(() => {
    push.mockReset();
    nav.pathname = "/home";
  });

  it("limits the customer rail to this engagement", () => {
    const markup = shellMarkup("customer");
    expect(markup).toContain('href="/customer"');
    expect(markup).not.toMatch(/href="\/"(?=[\s>])/);
    expect(markup).toContain('href="/scope"');
    expect(markup).toContain('href="/funding"');
    expect(markup).toContain("Your engagement");
    expect(markup).toContain("CDW");
    expect(markup).not.toContain("Partner network");
    expect(markup).not.toContain("Priya");
    expect(markup).toContain("Switch person");
    expect(markup).toContain('href="/enter"');
    expect(markup).not.toContain("Illustrative portfolio");
    expect(markup).not.toContain('href="/telemetry"');
    expect(markup).not.toContain('href="/sessions"');
    expect(markup).not.toContain("My sessions");
    expect(markup).not.toContain("Programs");
    expect(markup).not.toContain("Support");
    expect(markup).not.toContain("Telemetry");
  });

  it("keeps the partner and PDM rails and breadcrumbs", () => {
    for (const actor of ["partner", "pdm"]) {
      const markup = shellMarkup(actor);
      expect(markup).toContain('href="/home"');
      expect(markup).toContain('href="/telemetry"');
      expect(markup).toContain('href="/funding"');
      expect(markup).toContain("Programs");
      expect(markup).toContain("Support");
      expect(markup).toContain("Switch person");
      expect(markup).toContain('href="/enter"');
      expect(markup).not.toContain("Your engagement");
      expect(markup).not.toContain("Mock partner portal");
    }
    expect(shellMarkup("partner")).toContain('href="/sessions"');
    expect(shellMarkup("partner")).toContain("My sessions");
    expect(shellMarkup("partner")).toContain('href="/scope"');
    expect(shellMarkup("partner")).toContain("CDW");
    expect(shellMarkup("partner")).not.toContain(">PN<");
    expect(shellMarkup("pdm")).toContain("Google");
    expect(shellMarkup("partner")).not.toContain("Partner network");
    expect(shellMarkup("pdm")).not.toContain("CDW");
    expect(shellMarkup("pdm")).not.toContain("SoftwareOne");
  });

  it("gives the PDM no session links in the rail", () => {
    const markup = shellMarkup("pdm");
    expect(markup).not.toContain('href="/sessions"');
    expect(markup).not.toContain("My sessions");
    expect(markup).not.toContain('href="/scope"');
    expect(markup).not.toContain("Value sessions");
  });

  it("holds the PDM off the session routes", () => {
    for (const pathname of ["/sessions", "/scope", "/plan", "/run", "/rank", "/hackathon", "/artifact", "/pilot-spec", "/try"]) {
      nav.pathname = pathname;
      const markup = shellMarkup("pdm");
      expect(markup).toContain("Sessions are partner-held.");
      expect(markup).toContain("Back to the portfolio");
      expect(markup).toContain('href="/home"');
      expect(markup).not.toContain("<p>body</p>");
    }
    nav.pathname = "/scope";
    expect(shellMarkup("partner")).toContain("<p>body</p>");
    expect(shellMarkup("partner")).not.toContain("Sessions are partner-held.");
    nav.pathname = "/funding";
    expect(shellMarkup("pdm")).toContain("<p>body</p>");
  });

  it("wears the brand skin for the partner and the customer, never for the PDM", () => {
    for (const actor of ["partner", "customer"]) {
      const markup = shellMarkup(actor);
      expect(markup).toContain("--md-sys-color-primary:#cc1827");
      expect(markup).toContain("--md-sys-font:Arial, Helvetica, sans-serif");
      expect(markup).toContain("--md-sys-shape-full:4px");
      expect(markup).toContain("--brand-accent:#cc1827");
    }
    const pdm = shellMarkup("pdm");
    expect(pdm).not.toContain("#cc1827");
    expect(pdm).not.toContain("--md-sys-font");
    expect(pdm).not.toContain("--md-sys-shape-full");

    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.softwareone,
      viewer: { actor: "partner", name: "Ravi Menon", org: "SoftwareOne" },
      setActor: vi.fn(),
      hydrated: true,
    });
    const softwareone = renderToStaticMarkup(<AppShell><p>body</p></AppShell>);
    expect(softwareone).toContain("--md-sys-color-primary:#c84318");
    expect(softwareone).toContain("--md-sys-shape-full:9999px");
    expect(softwareone).toContain(">softwareone<");
    expect(softwareone).not.toContain("#cc1827");

    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.softwareone,
      viewer: { actor: "pdm", name: "Priya Raghavan", org: "Platform vendor" },
      setActor: vi.fn(),
      hydrated: true,
    });
    const pdmUnderSwitch = renderToStaticMarkup(<AppShell><p>body</p></AppShell>);
    expect(pdmUnderSwitch).not.toContain("#c84318");
    expect(pdmUnderSwitch).toContain("Google");
  });

  it("opens the shared root and /enter as the chooser, without the rail", () => {
    sessionFor("partner");
    for (const pathname of ["/", "/enter"]) {
      nav.pathname = pathname;
      const markup = renderToStaticMarkup(<AppShell><p>body</p></AppShell>);
      expect(markup).toContain("<p>body</p>");
      expect(markup).not.toContain("Switch person");
      expect(markup).not.toContain("My sessions");
    }
  });

  it("names the document for the person who is here", () => {
    sessionFor("partner");
    render(<AppShell><p>body</p></AppShell>);
    expect(document.title).toBe("CDW");
    sessionFor("pdm");
    render(<AppShell><p>body</p></AppShell>);
    expect(document.title).toBe("Google");
  });

  it("labels an unnamed customer as Customer", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, scopeMode: "cold", customerName: "" },
        coldAttendees: [],
        attendees: [],
      },
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      setActor: vi.fn(),
      hydrated: true,
    });
    const markup = renderToStaticMarkup(<AppShell><p>body</p></AppShell>);
    expect(markup).toContain("Switch person");
    expect(markup).not.toContain("Dana Reyes · customer");
    expect(markup).not.toContain("Priya");
  });
});
