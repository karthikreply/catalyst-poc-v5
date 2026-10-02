// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialSessionGraph } from "@/lib/seed";
import { applyDeliveryMode, bookHackathon, rankedSolutions, toggleSelected } from "@/lib/session";

const shellNav = vi.hoisted(() => ({
  pathname: "/customer",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => shellNav.pathname,
  useRouter: () => ({ push: shellNav.push, replace: vi.fn() }),
}));

import { AppShell } from "./app-shell";
import { GRAPH_KEY, SessionProvider, useSession } from "./session-provider";

function SessionActionsProbe() {
  const {
    graph,
    viewer,
    savePartnerNote,
    updateValueConfirmer,
    applyClaimsChoice,
    applyExactClaims,
    setActiveStep,
    updateValue,
    setPilotPick,
    recordHandoff,
    canEditSession,
  } = useSession();
  const claims = graph.valueInputs.find((input) => input.id === "claims");
  const handling = graph.costComponents.find((component) => component.id === "handling");
  const activeStep = graph.agenda.find((step) => step.state === "active");
  const bookedIds = graph.hackathon?.solutionIds ?? [];

  return (
    <>
      <output aria-label="actor">{viewer.actor}</output>
      <output aria-label="can-edit">{String(canEditSession)}</output>
      <output aria-label="active-step">{activeStep?.id ?? "none"}</output>
      <output aria-label="pilot-pick">{graph.outcome.pilotPick ?? "none"}</output>
      <output aria-label="handoff">{graph.session.handoff?.kind ?? "none"}</output>
      <button type="button" onClick={() => recordHandoff("daf")}>Hand off DAF</button>
      <button type="button" onClick={() => recordHandoff("pilot")}>Hand off pilot</button>
      <button type="button" onClick={() => setPilotPick(bookedIds[0])}>Pick first</button>
      <button type="button" onClick={() => setPilotPick(bookedIds[1])}>Pick second</button>
      <button type="button" onClick={() => setActiveStep("shape-the-pilot")}>Go to shape</button>
      <button type="button" onClick={() => updateValue("claims", 275)}>Set claims 275</button>
      <output aria-label="partner-note-count">{graph.partnerNotes.length}</output>
      <output aria-label="claims-confirmer">{claims?.confirmedBy ?? "none"}</output>
      <output aria-label="claims-respondent-confirmed">{String(claims?.respondentConfirmed)}</output>
      <output aria-label="claims-quantity">{claims?.quantity ?? "none"}</output>
      <output aria-label="handling-confirmer">{handling?.confirmedBy ?? "none"}</output>
      <button type="button" onClick={() => savePartnerNote(null, "Partner context")}>Save note</button>
      <button type="button" onClick={() => updateValueConfirmer("claims", "Alex Chen")}>Update confirmer</button>
      <button type="button" onClick={() => applyClaimsChoice("exact")}>Select exact</button>
      <button type="button" onClick={() => applyExactClaims(275)}>Set exact claims</button>
      <button type="button" onClick={() => applyExactClaims(0)}>Clear invalid exact claims</button>
    </>
  );
}

function renderForActor(actor: "pdm" | "partner" | "customer", graph = initialSessionGraph) {
  localStorage.setItem("catalyst-session-graph-v4", JSON.stringify(graph));
  sessionStorage.setItem("catalyst-viewer-actor", actor);
  render(
    <SessionProvider>
      <SessionActionsProbe />
    </SessionProvider>,
  );
}

function SamplePersistProbe() {
  const { graph, setActor, startSampleRun, markSampleClaim } = useSession();
  return (
    <>
      <output aria-label="sample-verdict">{graph.sampleRun?.marks["claim-1"]?.verdict ?? "none"}</output>
      <button type="button" onClick={() => startSampleRun()}>Start sample</button>
      <button type="button" onClick={() => markSampleClaim("claim-1", "right", [])}>Mark sample claim</button>
      <button type="button" onClick={() => setActor("customer")}>Switch to customer</button>
    </>
  );
}

describe("SessionProvider action permissions", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not save partner notes or update confirmers for CPM", async () => {
    renderForActor("customer");
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("customer"));

    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    fireEvent.click(screen.getByRole("button", { name: "Update confirmer" }));

    expect(screen.getByLabelText("partner-note-count")).toHaveTextContent("0");
    expect(screen.getByLabelText("claims-confirmer")).toHaveTextContent("Michelle Dorsey");
  });

  it.each(["pdm", "partner"] as const)("allows the editable %s actor to save partner notes and update confirmers", async (actor) => {
    renderForActor(actor);
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent(actor));

    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    fireEvent.click(screen.getByRole("button", { name: "Update confirmer" }));

    expect(screen.getByLabelText("partner-note-count")).toHaveTextContent("1");
    expect(screen.getByLabelText("claims-confirmer")).toHaveTextContent("Alex Chen");
  });

  it("applies only valid exact claims for an editable actor", async () => {
    renderForActor("partner");
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("partner"));

    fireEvent.click(screen.getByRole("button", { name: "Select exact" }));
    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "Set exact claims" }));
    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("275");
    expect(screen.getByLabelText("claims-confirmer")).toHaveTextContent("none");
    expect(screen.getByLabelText("claims-respondent-confirmed")).toHaveTextContent("false");
    expect(screen.getByLabelText("handling-confirmer")).toHaveTextContent("Michelle Dorsey");

    fireEvent.click(screen.getByRole("button", { name: "Clear invalid exact claims" }));
    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("none");
  });

  it("moves the agenda for a read-only customer but drops value edits", async () => {
    renderForActor("customer");
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("customer"));

    expect(screen.getByLabelText("can-edit")).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: "Go to shape" }));
    fireEvent.click(screen.getByRole("button", { name: "Set claims 275" }));

    expect(screen.getByLabelText("active-step")).toHaveTextContent("shape-the-pilot");
    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("400");
  });

  it("lets a self-service customer edit values", async () => {
    renderForActor("customer", applyDeliveryMode(initialSessionGraph, "self-service"));
    await waitFor(() => expect(screen.getByLabelText("can-edit")).toHaveTextContent("true"));

    fireEvent.click(screen.getByRole("button", { name: "Set claims 275" }));

    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("275");
  });

  it("clears the customer door when leaving the customer and does not change delivery", async () => {
    function CustomerDoorProbe() {
      const { graph, setActor, setCustomerDoor } = useSession();
      return (
        <>
          <output aria-label="customer-door">{String(graph.session.customerDoor)}</output>
          <output aria-label="delivery">{graph.session.delivery}</output>
          <output aria-label="mechanic">{graph.session.mechanic}</output>
          <output aria-label="account">{graph.session.customerName}</output>
          <button type="button" onClick={() => setCustomerDoor(true)}>Open customer door</button>
          <button type="button" onClick={() => setActor("customer")}>View as customer</button>
          <button type="button" onClick={() => setActor("partner")}>View as partner</button>
          <button type="button" onClick={() => setActor("pdm")}>View as pdm</button>
        </>
      );
    }

    render(
      <SessionProvider>
        <CustomerDoorProbe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("delivery")).toHaveTextContent("facilitated"));
    expect(screen.getByLabelText("customer-door")).toHaveTextContent("false");
    expect(screen.getByLabelText("account")).toHaveTextContent("Heartland Mutual Insurance");

    fireEvent.click(screen.getByRole("button", { name: "View as customer" }));
    expect(screen.getByLabelText("customer-door")).toHaveTextContent("false");
    expect(screen.getByLabelText("delivery")).toHaveTextContent("facilitated");
    expect(screen.getByLabelText("mechanic")).toHaveTextContent("value-sprint");

    fireEvent.click(screen.getByRole("button", { name: "Open customer door" }));
    expect(screen.getByLabelText("customer-door")).toHaveTextContent("true");
    expect(screen.getByLabelText("delivery")).toHaveTextContent("facilitated");
    expect(screen.getByLabelText("mechanic")).toHaveTextContent("value-sprint");
    expect(screen.getByLabelText("account")).toHaveTextContent("Heartland Mutual Insurance");

    fireEvent.click(screen.getByRole("button", { name: "View as partner" }));
    expect(screen.getByLabelText("customer-door")).toHaveTextContent("false");
    expect(screen.getByLabelText("delivery")).toHaveTextContent("facilitated");

    fireEvent.click(screen.getByRole("button", { name: "Open customer door" }));
    fireEvent.click(screen.getByRole("button", { name: "View as pdm" }));
    expect(screen.getByLabelText("customer-door")).toHaveTextContent("false");
    expect(screen.getByLabelText("delivery")).toHaveTextContent("facilitated");
    expect(screen.getByLabelText("mechanic")).toHaveTextContent("value-sprint");
  });

  it("still opens the partner view when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    function HydrationProbe() {
      const { hydrated, viewer } = useSession();
      return <output aria-label="hydration">{hydrated ? viewer.actor : "pending"}</output>;
    }

    render(
      <SessionProvider>
        <HydrationProbe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("hydration")).toHaveTextContent("partner"));
  });

  it("does not apply exact claims for CPM", async () => {
    renderForActor("customer");
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("customer"));

    fireEvent.click(screen.getByRole("button", { name: "Select exact" }));
    fireEvent.click(screen.getByRole("button", { name: "Set exact claims" }));

    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("400");
    expect(screen.getByLabelText("claims-confirmer")).toHaveTextContent("Michelle Dorsey");
    expect(screen.getByLabelText("claims-respondent-confirmed")).toHaveTextContent("true");
  });

  describe("pilot pick", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const booked = bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });

    it.each(["partner", "customer"] as const)("lets the %s record Go on the booked solution", async (actor) => {
      const graph = actor === "customer"
        ? { ...booked, session: { ...booked.session, delivery: "self-service" as const } }
        : booked;
      renderForActor(actor, graph);
      await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent(actor));
      expect(screen.getByLabelText("pilot-pick")).toHaveTextContent("none");

      fireEvent.click(screen.getByRole("button", { name: "Pick first" }));
      expect(screen.getByLabelText("pilot-pick")).toHaveTextContent(ids[0]);

      fireEvent.click(screen.getByRole("button", { name: "Pick second" }));
      expect(screen.getByLabelText("pilot-pick")).toHaveTextContent(ids[1]);
    });

    it("does not let the PDM set the pilot pick", async () => {
      renderForActor("pdm", booked);
      await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("pdm"));

      fireEvent.click(screen.getByRole("button", { name: "Pick first" }));
      expect(screen.getByLabelText("pilot-pick")).toHaveTextContent("none");
    });

    it("keeps the pilot pick from writing a handoff", async () => {
      renderForActor("partner", booked);
      await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("partner"));

      fireEvent.click(screen.getByRole("button", { name: "Pick first" }));
      expect(screen.getByLabelText("pilot-pick")).toHaveTextContent(ids[0]);
      expect(screen.getByLabelText("handoff")).toHaveTextContent("none");
    });
  });

  describe("handoff", () => {
    it("lets the partner record it once", async () => {
      renderForActor("partner");
      await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("partner"));

      fireEvent.click(screen.getByRole("button", { name: "Hand off DAF" }));
      expect(screen.getByLabelText("handoff")).toHaveTextContent("daf");

      fireEvent.click(screen.getByRole("button", { name: "Hand off pilot" }));
      expect(screen.getByLabelText("handoff")).toHaveTextContent("daf");
    });

    it.each(["customer", "pdm"] as const)("does not write for the %s", async (actor) => {
      renderForActor(actor);
      await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent(actor));

      fireEvent.click(screen.getByRole("button", { name: "Hand off DAF" }));
      expect(screen.getByLabelText("handoff")).toHaveTextContent("none");
    });
  });

  it("keeps the stored graph key", () => {
    expect(GRAPH_KEY).toBe("catalyst-session-graph-v4");
  });

  it("keeps sample marks when the viewer changes", async () => {
    render(
      <SessionProvider>
        <SamplePersistProbe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Start sample" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Start sample" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark sample claim" }));
    await waitFor(() => expect(screen.getByLabelText("sample-verdict")).toHaveTextContent("right"));

    fireEvent.click(screen.getByRole("button", { name: "Switch to customer" }));
    expect(screen.getByLabelText("sample-verdict")).toHaveTextContent("right");
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(GRAPH_KEY) ?? "{}") as { sampleRun?: { marks?: Record<string, { verdict?: string }> } };
      expect(saved.sampleRun?.marks?.["claim-1"]?.verdict).toBe("right");
    });
  });

  it("does not replace a stored customer with the partner on customer pages", async () => {
    for (const pathname of ["/customer", "/artifact", "/rank"]) {
      shellNav.pathname = pathname;
      shellNav.push.mockClear();
      sessionStorage.setItem("catalyst-viewer-actor", "customer");
      localStorage.setItem(GRAPH_KEY, JSON.stringify(initialSessionGraph));
      const view = render(
        <SessionProvider>
          <AppShell><p>body</p></AppShell>
        </SessionProvider>,
      );
      await waitFor(() => expect(view.getByRole("link", { name: "CDW" })).toBeTruthy());
      expect(shellNav.push).not.toHaveBeenCalled();
      expect(sessionStorage.getItem("catalyst-viewer-actor")).toBe("customer");
      expect(view.queryByText("My sessions")).toBeNull();
      expect(view.queryByText("Priya Raghavan · PDM")).toBeNull();
      expect(view.getAllByText("Your engagement").length).toBeGreaterThan(0);
      expect(view.getByRole("link", { name: "CDW" })).toHaveAttribute("href", "/customer");
      view.unmount();
    }
  });

  it("migrates a saved customer actor", async () => {
    shellNav.pathname = "/customer";
    sessionStorage.setItem("catalyst-viewer-actor", "c\u0070m");
    localStorage.setItem(GRAPH_KEY, JSON.stringify(initialSessionGraph));
    const view = render(
      <SessionProvider>
        <AppShell><p>body</p></AppShell>
      </SessionProvider>,
    );
    await waitFor(() => expect(view.getByRole("link", { name: "CDW" })).toBeTruthy());
    expect(sessionStorage.getItem("catalyst-viewer-actor")).toBe("customer");
    expect(view.queryByText("Priya Raghavan · PDM")).toBeNull();
    view.unmount();
  });
});
