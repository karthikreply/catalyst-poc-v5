"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { brands, type Brand, type BrandId } from "@/lib/brands";
import { freezeLedger } from "@/lib/cost-model";
import {
  initialSessionGraph,
  type Actor,
  type Capture,
  type CloseStyle,
  type ColdAttendee,
  type ColdCompany,
  type Delivery,
  type HandoffKind,
  type Mechanic,
  type SessionFocus,
  type SessionGraph,
} from "@/lib/seed";
import {
  applyClaimsVolumeChoice,
  applyCloseStyle,
  applyColdScope,
  applyDeliveryMode,
  applyExactClaimsVolume,
  applyFundingRoute,
  applyMechanic,
  applyPatternChoice,
  applyReusePriorPilotSpec,
  bindAnnualValue,
  bookHackathon as bookHackathonInGraph,
  canBookHackathon,
  canRecordHackathonDecision,
  chooseCustomerFormat as chooseCustomerFormatInGraph,
  markPilotSigned as markPilotSignedInGraph,
  markHackathonCalendarAdded as markHackathonCalendarAddedInGraph,
  markHackathonMeetAdded as markHackathonMeetAddedInGraph,
  castVote as castVoteInGraph,
  graphForActor,
  hydrateSessionGraph,
  isCustomerViewer,
  migrateStoredActor,
  canMutateSampleRun,
  canSetSamplePosition,
  isSessionReadOnly,
  lockRanking as lockRankingInGraph,
  markSampleClaim as markSampleClaimInGraph,
  moveSolution as moveSolutionInGraph,
  recordNotGoingAhead as recordNotGoingAheadInGraph,
  recordHandoff as recordHandoffInGraph,
  restoreSeededGraph,
  savePartnerNote as savePartnerNoteInGraph,
  saveSessionOutcome as saveSessionOutcomeInGraph,
  setPilotPick as setPilotPickInGraph,
  setSessionFocus,
  setSamplePosition as setSamplePositionInGraph,
  startOverSampleRun as startOverSampleRunInGraph,
  startSampleRun as startSampleRunInGraph,
  submitFundingClaim as submitFundingClaimInGraph,
  withdrawFundingClaim as withdrawFundingClaimInGraph,
  toggleSelected as toggleSelectedInGraph,
  unlockRanking as unlockRankingInGraph,
  updateCapture as updateCaptureInGraph,
  updateValueConfirmer as updateValueConfirmerInGraph,
  viewerForActor,
  type ClaimsVolumeChoice,
  type FundingRoute,
  type HackathonDraft,
  type Viewer,
} from "@/lib/session";

type SessionContextValue = {
  graph: SessionGraph;
  brandId: BrandId;
  brand: Brand;
  viewer: Viewer;
  setBrandId: (id: BrandId) => void;
  setActor: (actor: Actor) => void;
  setFocus: (focus: SessionFocus) => void;
  setCustomerDoor: (open: boolean) => void;
  setDelivery: (delivery: Delivery) => void;
  setMechanic: (mechanic: Mechanic) => void;
  setCloseStyle: (closeStyle: CloseStyle) => void;
  updateValue: (id: string, quantity: number | null) => void;
  updateValueConfirmer: (inputId: string, confirmer: string | null) => void;
  updateCostInput: (componentId: string, inputLabel: string, quantity: number | null) => void;
  freezeLedgerNow: () => void;
  addCapture: (capture: Omit<Capture, "id" | "sessionId" | "capturedAt">) => void;
  updateCapture: (captureId: string, update: { attributedTo: string; text: string }) => void;
  saveSessionOutcome: (update: { useCase: string; constraint: string; nextStep: string }) => void;
  setActiveStep: (stepId: string) => void;
  applyClaimsChoice: (choice: ClaimsVolumeChoice) => void;
  applyExactClaims: (quantity: number | null) => void;
  applyFunding: (route: FundingRoute) => void;
  applyPattern: (patternId: string) => void;
  applyReusePilot: (reuse: boolean) => void;
  setCustomerProfile: (profile: { name?: string; context?: string }) => void;
  setColdScope: (company: ColdCompany, attendees: ColdAttendee[]) => void;
  restoreSeededScope: () => void;
  savePartnerNote: (noteId: string | null, text: string) => void;
  moveSolution: (solutionId: string, direction: "up" | "down") => void;
  toggleSelected: (solutionId: string) => void;
  castVote: (attendeeId: string, solutionId: string) => void;
  lockRanking: () => void;
  unlockRanking: () => void;
  bookHackathon: (draft: HackathonDraft) => void;
  markHackathonCalendarAdded: () => void;
  markHackathonMeetAdded: () => void;
  setPilotPick: (solutionId: string) => void;
  recordNotGoingAhead: () => void;
  markPilotSigned: () => void;
  submitFundingClaim: () => void;
  withdrawFundingClaim: () => void;
  recordHandoff: (kind: HandoffKind) => void;
  chooseCustomerFormat: (mechanic: Mechanic) => void;
  startSampleRun: () => void;
  markSampleClaim: (claimId: string, verdict: "right" | "fix", fields: string[], advance?: boolean) => void;
  setSamplePosition: (position: number) => void;
  startOverSampleRun: () => void;
  canEditSession: boolean;
  hydrated: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);
export const GRAPH_KEY = "catalyst-session-graph-v4";
const BRAND_KEY = "catalyst-brand";
const ACTOR_KEY = "catalyst-viewer-actor";
const SEEDED_GRAPH_KEY = "catalyst-seeded-graph-v4";
const SUPERSEDED_KEYS = [
  "catalyst-session-graph",
  "catalyst-seeded-graph",
  "catalyst-session-graph-v2",
  "catalyst-seeded-graph-v2",
  "catalyst-session-graph-v3",
  "catalyst-seeded-graph-v3",
];

/** Read the stored session once on mount. Private windows can block storage; the default partner view still opens. */
function hydrateFromStorage(apply: {
  graph: (graph: SessionGraph) => void;
  brand: (brandId: BrandId) => void;
  actor: (actor: Actor) => void;
  hydrated: () => void;
}) {
  try {
    SUPERSEDED_KEYS.forEach((key) => localStorage.removeItem(key));
    const savedGraph = localStorage.getItem(GRAPH_KEY);
    const savedBrand = localStorage.getItem(BRAND_KEY) as BrandId | null;
    const savedActor = migrateStoredActor(sessionStorage.getItem(ACTOR_KEY));
    if (savedGraph) {
      try {
        const savedViewer = savedActor ?? "partner";
        apply.graph(graphForActor(hydrateSessionGraph(JSON.parse(savedGraph) as SessionGraph), savedViewer));
      } catch {
        localStorage.removeItem(GRAPH_KEY);
      }
    }
    if (savedBrand && brands[savedBrand]) apply.brand(savedBrand);
    if (savedActor) {
      apply.actor(savedActor);
      if (sessionStorage.getItem(ACTOR_KEY) !== savedActor) sessionStorage.setItem(ACTOR_KEY, savedActor);
    }
  } catch {
    // Storage blocked. Fall through so the default partner view still opens.
  }
  apply.hydrated();
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [graph, setGraph] = useState<SessionGraph>(initialSessionGraph);
  const [brandId, setBrandIdState] = useState<BrandId>("cdw");
  const [actor, setActorState] = useState<Actor>("partner");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrateFromStorage({
      graph: setGraph,
      brand: setBrandIdState,
      actor: setActorState,
      hydrated: () => setHydrated(true),
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(GRAPH_KEY, JSON.stringify(graph));
    } catch {
      // Keep the in-memory session when storage is unavailable.
    }
  }, [graph, hydrated]);

  const brand = brands[brandId];
  const viewer = viewerForActor(actor, brand, graph);
  const canEditSession = !isSessionReadOnly(actor, graph);
  const canCustomerAct = canEditSession || isCustomerViewer(actor);

  function setBrandId(id: BrandId) {
    setBrandIdState(id);
    localStorage.setItem(BRAND_KEY, id);
    setGraph((current) => ({ ...current, session: { ...current.session, partnerId: id } }));
  }

  function setFocus(focus: SessionFocus) {
    setGraph((current) => setSessionFocus(current, focus));
  }

  function setActor(next: Actor) {
    setActorState(next);
    sessionStorage.setItem(ACTOR_KEY, next);
    setGraph((current) => {
      const nextGraph = graphForActor(current, next);
      if (isCustomerViewer(next) || nextGraph.session.customerDoor !== true) return nextGraph;
      return {
        ...nextGraph,
        session: { ...nextGraph.session, customerDoor: false },
      };
    });
  }

  function setCustomerDoor(open: boolean) {
    setGraph((current) => (
      current.session.customerDoor === open
        ? current
        : { ...current, session: { ...current.session, customerDoor: open } }
    ));
  }

  function setDelivery(delivery: Delivery) {
    if (!canEditSession) return;
    setGraph((current) => applyDeliveryMode(current, delivery));
  }

  function setMechanic(mechanic: Mechanic) {
    if (!canEditSession) return;
    setGraph((current) => applyMechanic(current, mechanic));
  }

  function setCloseStyle(closeStyle: CloseStyle) {
    if (!canEditSession) return;
    setGraph((current) => applyCloseStyle(current, closeStyle));
  }

  function updateValue(id: string, quantity: number | null) {
    if (!canEditSession || (quantity !== null && (!Number.isFinite(quantity) || quantity < 0))) return;
    setGraph((current) => {
      const valueInputs = current.valueInputs.map((input) => (input.id === id ? { ...input, quantity } : input));
      const next = { ...current, valueInputs };
      if (current.session.mechanic !== "value-sprint") return next;
      return bindAnnualValue(next);
    });
  }

  function updateValueConfirmer(inputId: string, confirmer: string | null) {
    if (!canEditSession) return;
    setGraph((current) => updateValueConfirmerInGraph(current, inputId, confirmer));
  }

  function updateCostInput(componentId: string, inputLabel: string, quantity: number | null) {
    if (!canEditSession || (quantity !== null && (!Number.isFinite(quantity) || quantity < 0))) return;
    setGraph((current) => ({
      ...current,
      costComponents: current.costComponents.map((component) =>
        component.id === componentId
          ? {
              ...component,
              inputs: component.inputs.map((input) => (input.label === inputLabel ? { ...input, quantity } : input)),
            }
          : component,
      ),
    }));
  }

  function freezeLedgerNow() {
    if (!canEditSession) return;
    setGraph((current) => freezeLedger(current));
  }

  function addCapture(capture: Omit<Capture, "id" | "sessionId" | "capturedAt">) {
    if (!canEditSession) return;
    setGraph((current) => ({
      ...current,
      captures: [
        ...current.captures,
        {
          ...capture,
          id: `capture-${Date.now()}`,
          sessionId: current.session.id,
          capturedAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function updateCapture(captureId: string, update: { attributedTo: string; text: string }) {
    if (!canEditSession) return;
    setGraph((current) => updateCaptureInGraph(current, captureId, update));
  }

  function saveSessionOutcome(update: { useCase: string; constraint: string; nextStep: string }) {
    if (!canEditSession) return;
    setGraph((current) => saveSessionOutcomeInGraph(current, update));
  }

  function setActiveStep(stepId: string) {
    // Agenda navigation always moves, even on a read-only session.
    setGraph((current) => ({
      ...current,
      agenda: current.agenda.map((step) => ({
        ...step,
        state: step.id === stepId ? "active" : step.order < (current.agenda.find((item) => item.id === stepId)?.order ?? 1) ? "done" : "upcoming",
      })),
    }));
  }

  function applyClaimsChoice(choice: ClaimsVolumeChoice) {
    if (!canEditSession) return;
    setGraph((current) => applyClaimsVolumeChoice(current, choice));
  }

  function applyExactClaims(quantity: number | null) {
    if (!canEditSession) return;
    setGraph((current) => (
      current.session.claimsVolumeChoice === "exact"
        ? applyExactClaimsVolume(current, quantity)
        : current
    ));
  }

  function applyFunding(route: FundingRoute) {
    if (!canEditSession) return;
    setGraph((current) => applyFundingRoute(current, route));
  }

  function applyPattern(patternId: string) {
    if (!canEditSession) return;
    setGraph((current) => applyPatternChoice(current, patternId));
  }

  function applyReusePilot(reuse: boolean) {
    if (!canEditSession) return;
    setGraph((current) => applyReusePriorPilotSpec(current, reuse));
  }

  function setCustomerProfile({ name, context }: { name?: string; context?: string }) {
    if (!canEditSession) return;
    setGraph((current) => ({
      ...current,
      session: {
        ...current.session,
        customerName: name ?? current.session.customerName,
        customerContext: context ?? current.session.customerContext,
      },
    }));
  }

  function setColdScope(company: ColdCompany, attendees: ColdAttendee[]) {
    // Customer may enter a cold account after a lookup miss.
    if (!canCustomerAct) return;
    setGraph((current) => {
      if (current.session.scopeMode === "seeded") {
        localStorage.setItem(SEEDED_GRAPH_KEY, JSON.stringify(current));
      }
      return applyColdScope(current, company, attendees);
    });
  }

  function restoreSeededScope() {
    if (!canCustomerAct) return;
    const saved = localStorage.getItem(SEEDED_GRAPH_KEY);
    let parsed: SessionGraph | null = null;
    if (saved) {
      try {
        parsed = JSON.parse(saved) as SessionGraph;
      } catch {
        localStorage.removeItem(SEEDED_GRAPH_KEY);
      }
    }
    setGraph(restoreSeededGraph(parsed));
  }

  function savePartnerNote(noteId: string | null, text: string) {
    if (!canEditSession) return;
    setGraph((current) => savePartnerNoteInGraph(current, {
      id: noteId ?? `partner-note-${Date.now()}`,
      author: viewer.name,
      text: text.trim(),
      updatedAt: new Date().toISOString(),
    }));
  }

  function moveSolution(solutionId: string, direction: "up" | "down") {
    if (!canCustomerAct) return;
    setGraph((current) => moveSolutionInGraph(current, solutionId, direction));
  }

  function toggleSelected(solutionId: string) {
    if (!canCustomerAct) return;
    setGraph((current) => toggleSelectedInGraph(current, solutionId));
  }

  function castVote(attendeeId: string, solutionId: string) {
    if (!canCustomerAct) return;
    setGraph((current) => castVoteInGraph(current, attendeeId, solutionId));
  }

  function lockRanking() {
    if (!canCustomerAct) return;
    setGraph((current) => lockRankingInGraph(current));
  }

  function unlockRanking() {
    if (!canCustomerAct) return;
    setGraph((current) => unlockRankingInGraph(current));
  }

  function bookHackathon(draft: HackathonDraft) {
    if (!canBookHackathon(actor)) return;
    setGraph((current) => bookHackathonInGraph(current, draft));
  }

  function setPilotPick(solutionId: string) {
    setGraph((current) => (canRecordHackathonDecision(actor, current) ? setPilotPickInGraph(current, solutionId) : current));
  }

  function recordNotGoingAhead() {
    setGraph((current) => (canRecordHackathonDecision(actor, current) ? recordNotGoingAheadInGraph(current) : current));
  }

  function markPilotSigned() {
    setGraph((current) => (canRecordHackathonDecision(actor, current) ? markPilotSignedInGraph(current, viewer.name) : current));
  }

  function submitFundingClaim() {
    // Only the partner submits the claim, and only once the hackathon is booked.
    if (actor !== "partner") return;
    setGraph((current) => submitFundingClaimInGraph(current, viewer.name));
  }

  function withdrawFundingClaim() {
    if (actor !== "partner") return;
    setGraph((current) => withdrawFundingClaimInGraph(current));
  }

  function recordHandoff(kind: HandoffKind) {
    // Only the partner hands the session off. The customer and the PDM only see the result.
    if (actor !== "partner") return;
    setGraph((current) => recordHandoffInGraph(current, kind));
  }

  function markHackathonCalendarAdded() {
    if (!canCustomerAct) return;
    setGraph((current) => markHackathonCalendarAddedInGraph(current));
  }

  function markHackathonMeetAdded() {
    if (!canCustomerAct) return;
    setGraph((current) => markHackathonMeetAddedInGraph(current));
  }

  function chooseCustomerFormat(mechanic: Mechanic) {
    // Customer door only: starting the session is what makes it editable.
    if (!isCustomerViewer(actor)) return;
    setGraph((current) => chooseCustomerFormatInGraph(current, mechanic));
  }

  function startSampleRun() {
    if (!canMutateSampleRun(actor, graph)) return;
    setGraph((current) => startSampleRunInGraph(current, actor, viewer.name, new Date().toISOString()));
  }

  function markSampleClaim(claimId: string, verdict: "right" | "fix", fields: string[], advance = true) {
    if (!canMutateSampleRun(actor, graph)) return;
    setGraph((current) => markSampleClaimInGraph(current, actor, claimId, verdict, fields, viewer.name, new Date().toISOString(), advance));
  }

  function setSamplePosition(position: number) {
    if (!canSetSamplePosition(actor, graph)) return;
    setGraph((current) => setSamplePositionInGraph(current, actor, position));
  }

  function startOverSampleRun() {
    if (!canMutateSampleRun(actor, graph)) return;
    setGraph((current) => startOverSampleRunInGraph(current, actor));
  }

  const value = {
    graph,
    brandId,
    brand,
    viewer,
    setBrandId,
    setActor,
    setFocus,
    setCustomerDoor,
    setDelivery,
    setMechanic,
    setCloseStyle,
    updateValue,
    updateValueConfirmer,
    updateCostInput,
    freezeLedgerNow,
    addCapture,
    updateCapture,
    saveSessionOutcome,
    setActiveStep,
    applyClaimsChoice,
    applyExactClaims,
    applyFunding,
    applyPattern,
    applyReusePilot,
    setCustomerProfile,
    setColdScope,
    restoreSeededScope,
    savePartnerNote,
    moveSolution,
    toggleSelected,
    castVote,
    lockRanking,
    unlockRanking,
    bookHackathon,
    markHackathonCalendarAdded,
    markHackathonMeetAdded,
    setPilotPick,
    recordNotGoingAhead,
    markPilotSigned,
    submitFundingClaim,
    withdrawFundingClaim,
    recordHandoff,
    chooseCustomerFormat,
    startSampleRun,
    markSampleClaim,
    setSamplePosition,
    startOverSampleRun,
    canEditSession,
    hydrated,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}