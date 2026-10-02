import { describe, expect, it } from "vitest";

import { breadcrumbForPath, isBrandFlowPath, mergesSessionHeader, navItemsForActor, vendorNavItems } from "./vendor-shell";

describe("vendor shell routing", () => {
  it("keeps dashboard, my sessions, value sessions, funding, and telemetry live", () => {
    expect(vendorNavItems.filter((item) => item.href).map((item) => item.label)).toEqual([
      "Dashboard",
      "My sessions",
      "Value sessions",
      "Funding",
      "Telemetry",
    ]);
    expect(vendorNavItems.filter((item) => !item.href).every((item) => item.illustrative)).toBe(true);
  });

  it("marks only the partner workflow as brand-led", () => {
    expect(isBrandFlowPath("/scope", "partner")).toBe(true);
    expect(isBrandFlowPath("/artifact", "customer")).toBe(true);
    expect(isBrandFlowPath("/pilot-spec", "pdm")).toBe(true);
    expect(isBrandFlowPath("/", "partner")).toBe(false);
    expect(isBrandFlowPath("/funding", "partner")).toBe(true);
    expect(isBrandFlowPath("/funding", "pdm")).toBe(false);
    expect(isBrandFlowPath("/funding", "customer")).toBe(false);
    expect(isBrandFlowPath("/telemetry", "partner")).toBe(false);
    expect(isBrandFlowPath("/sessions", "partner")).toBe(false);
    expect(isBrandFlowPath("/sessions", "pdm")).toBe(false);
    expect(isBrandFlowPath("/sessions/", "partner")).toBe(false);
  });

  it("merges the session header into the brand band on run only", () => {
    expect(mergesSessionHeader("/run")).toBe(true);
    expect(mergesSessionHeader("/plan")).toBe(false);
    expect(mergesSessionHeader("/scope")).toBe(false);
    expect(mergesSessionHeader("/artifact")).toBe(false);
    expect(mergesSessionHeader("/funding")).toBe(false);
  });

  it("produces vendor breadcrumbs for dashboard, flow, funding, and telemetry", () => {
    expect(breadcrumbForPath("/", "partner")).toEqual(["Home", "Dashboard"]);
    expect(breadcrumbForPath("/", "pdm")).toEqual(["Google", "Dashboard"]);
    expect(breadcrumbForPath("/plan", "partner")).toEqual(["Home", "Value sessions", "Plan"]);
    expect(breadcrumbForPath("/rank", "pdm")).toEqual(["Google", "Value sessions", "Rank"]);
    expect(breadcrumbForPath("/hackathon", "partner")).toEqual(["Home", "Value sessions", "Hackathon"]);
    expect(isBrandFlowPath("/hackathon", "customer")).toBe(true);
    expect(isBrandFlowPath("/rank", "partner")).toBe(true);
    expect(isBrandFlowPath("/try", "partner")).toBe(true);
    expect(isBrandFlowPath("/try", "customer")).toBe(true);
    expect(breadcrumbForPath("/try", "partner")).toEqual(["Home", "Value sessions", "Try it"]);
    expect(breadcrumbForPath("/try/", "customer")).toEqual(["Your engagement", "Value sessions", "Try it"]);
    expect(breadcrumbForPath("/funding", "partner")).toEqual(["Home", "Funding"]);
    expect(breadcrumbForPath("/telemetry", "pdm")).toEqual(["Google", "Telemetry"]);
    expect(breadcrumbForPath("/sessions", "partner")).toEqual(["Home", "My sessions"]);
    expect(breadcrumbForPath("/sessions", "pdm")).toEqual(["Google", "My sessions"]);
    expect(breadcrumbForPath("/customer", "partner")).toEqual(["Home", "Customer"]);
    expect(isBrandFlowPath("/customer", "customer")).toBe(false);
  });

  it("names the customer's engagement on every page and limits the rail", () => {
    expect(navItemsForActor("customer").map((item) => [item.label, item.href])).toEqual([
      ["Dashboard", "/customer"],
      ["Value sessions", "/scope"],
      ["Funding", "/funding"],
    ]);
    expect(navItemsForActor("partner").map((item) => item.label)).toEqual(vendorNavItems.map((item) => item.label));
    expect(navItemsForActor("customer").some((item) => item.href === "/sessions" || item.label === "My sessions")).toBe(false);
    expect(navItemsForActor("partner").find((item) => item.label === "My sessions")?.href).toBe("/sessions");
    expect(navItemsForActor("pdm").find((item) => item.label === "Dashboard")?.href).toBe("/");
    for (const path of ["/", "/customer", "/scope", "/run", "/rank", "/artifact", "/funding"]) {
      expect(breadcrumbForPath(path, "customer")[0]).toBe("Your engagement");
    }
    expect(breadcrumbForPath("/funding", "customer")).toEqual(["Your engagement", "Funding"]);
    expect(breadcrumbForPath("/run", "customer")).toEqual(["Your engagement", "Value sessions", "Run"]);
  });
});
