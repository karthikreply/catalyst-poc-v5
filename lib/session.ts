import type { Brand } from "./brands";
import { ILLUSTRATIVE_FUND_PER_CLAIM } from "./pdm-portfolio";
import { ledgerAnnualTotal } from "./cost-model";
import {
  businessCaseSolutionIds,
  heartlandSolutions,
  initialSessionGraph,
  ledgerSolutionIds,
  type HackathonBooking,
  patterns,
  prework,
  type Actor,
  type AgendaStep,
  type Capture,
  type CloseStyle,
  type ColdAttendee,
  type ColdCompany,
  type Delivery,
  type Handoff,
  type HackathonDecision,
  type HandoffKind,
  type Mechanic,
  type PilotSignoff,
  type FundingClaim,
  type PartnerNote,
  type SampleRun,
  type Session,
  type SessionFocus,
  type SessionGraph,
  type SolutionCandidate,
} from "./seed";
import { isSampleClaimId, nextUnmarkedIndex, sampleClaimFields, sampleClaims, sampleRunTallies } from "./sample-claims";
import { calculateAnnualValue, calculateDailyValue, formatCurrency, formatPreciseCurrency } from "./value";

export type Viewer = { actor: Actor; name: string; org: string };
export type ClaimsVolumeChoice = "about-400" | "range-250-500" | "unconfirmed" | "exact";
export type FundingRoute = "invite-karen" | "brief-dana";

const coldRoleRules = [
  { role: "Operations owner", matches: ["operations", "claims ops", "vp claims", "head of claims"], reason: "Owns the operating outcome and can sponsor the pilot." },
  { role: "Frontline supervisor", matches: ["supervisor", "frontline", "team lead", "claims manager"], reason: "Brings the frontline workflow and handling-cost evidence." },
  { role: "Developer", matches: ["developer", "engineer", "technical lead"], reason: "Can confirm integration constraints and own the pilot." },
  { role: "Compliance", matches: ["compliance", "risk", "audit"], reason: "Sessions that invite compliance late lose two weeks." },
  { role: "Infrastructure", matches: ["infrastructure", "platform", "cloud", "architect"], reason: "Confirms data access, security, and deployment boundaries." },
  { role: "Economic buyer", matches: ["cfo", "finance", "economic buyer", "executive sponsor"], reason: "Can fund the pilot." },
] as const;

function matchedColdRole(role: string) {
  const normalized = role.toLowerCase();
  return coldRoleRules.find((rule) => rule.matches.some((term) => normalized.includes(term)));
}

export function coldRoleMatch(role: string) {
  return matchedColdRole(role)?.role ?? null;
}

const seededSolutionsById = new Map(heartlandSolutions.map((solution) => [solution.id, solution]));

/** Merge product chips from seed when older stored graphs omit them. */
export function withSolutionProducts(solutions: SolutionCandidate[]): SolutionCandidate[] {
  return solutions.map((solution) => {
    const seeded = seededSolutionsById.get(solution.id);
    const products = solution.products?.length ? solution.products : seeded?.products ?? [];
    return {
      ...solution,
      title: solution.title || seeded?.title || solution.id,
      outcome: solution.outcome || seeded?.outcome || "",
      valueAnchor: solution.valueAnchor || seeded?.valueAnchor || "",
      products,
      stepId: solution.stepId ?? seeded?.stepId,
    };
  });
}

export const coldScopeDefaults: { company: ColdCompany; attendees: ColdAttendee[] } = {
  company: { name: "Northwind Insurance", industry: "Insurance", sizeBand: "$500M–$1B" },
  attendees: [
    { name: "Laura Beckett", role: "VP Claims Operations" },
    { name: "Sam Ortiz", role: "Claims Supervisor" },
    { name: "Devin Cole", role: "Senior Developer" },
  ],
};

/** Named demonstration account. Keeps a searched company name when one was typed. */
export function demonstrationColdAccount(companyName?: string) {
  const name = companyName?.trim() || coldScopeDefaults.company.name;
  return {
    company: { ...coldScopeDefaults.company, name },
    attendees: coldScopeDefaults.attendees.map((person) => ({ ...person })),
  };
}

/** Fill blank company or room fields from the demonstration account. Returns null when already complete. */
export function withDemonstrationColdAccount(
  company: ColdCompany | null,
  attendees: ColdAttendee[],
) {
  const current = company ?? { name: "", industry: "", sizeBand: "" };
  const peopleBlank = attendees.length === 0 || attendees.every((person) => !person.name.trim());
  const companyThin = !current.name.trim() || !current.industry.trim() || !current.sizeBand.trim();
  if (!peopleBlank && !companyThin) return null;
  const demo = demonstrationColdAccount(current.name);
  return {
    company: {
      name: current.name.trim() || demo.company.name,
      industry: current.industry.trim() || demo.company.industry,
      sizeBand: current.sizeBand.trim() || demo.company.sizeBand,
    },
    attendees: peopleBlank ? demo.attendees : attendees.map((person) => ({ ...person })),
  };
}

export function restoreSeededGraph(saved: SessionGraph | null) {
  const hydrated = hydrateSessionGraph(saved);
  return hydrated.session.scopeMode === "seeded" ? hydrated : initialSessionGraph;
}

export function graphForActor(graph: SessionGraph, actor: Actor) {
  return actor === "pdm" && graph.session.scopeMode === "cold"
    ? initialSessionGraph
    : graph;
}

function emptyValueInputs(sessionId: string) {
  return initialSessionGraph.valueInputs.map((input) => ({
    ...input,
    sessionId,
    quantity: null,
    confirmedBy: null,
    respondentConfirmed: false,
  }));
}

function emptyCostComponents() {
  return initialSessionGraph.costComponents.map((component) => ({
    ...component,
    confirmedBy: null,
    inputs: component.inputs.map((input) => ({ ...input, quantity: null })),
  }));
}

function latestPartnerNote(notes: PartnerNote[]) {
  return notes.reduce<PartnerNote | null>((latest, note) => {
    if (!latest) return note;
    const noteTime = Date.parse(note.updatedAt);
    const latestTime = Date.parse(latest.updatedAt);
    if (Number.isNaN(noteTime)) return latest;
    if (Number.isNaN(latestTime) || noteTime > latestTime) return note;
    return latest;
  }, null);
}

const handoffKinds: HandoffKind[] = ["daf", "pilot", "pdm-notified"];

function hydratePilotSigned(value: unknown): PilotSignoff | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PilotSignoff>;
  if (typeof candidate.at !== "string" || typeof candidate.recordedBy !== "string" || !candidate.recordedBy.trim()) return null;
  return { at: candidate.at, recordedBy: candidate.recordedBy };
}

function hydrateFundingClaim(value: unknown): FundingClaim | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<FundingClaim>;
  if (typeof candidate.at !== "string" || typeof candidate.recordedBy !== "string" || !candidate.recordedBy.trim()) return null;
  if (typeof candidate.amount !== "number" || !Number.isFinite(candidate.amount)) return null;
  return { at: candidate.at, recordedBy: candidate.recordedBy, amount: candidate.amount };
}

function hydrateHackathonDecision(value: unknown): HackathonDecision | null {
  return value === "go" || value === "not-going-ahead" ? value : null;
}

function hydrateHandoff(value: unknown): Handoff | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Handoff>;
  if (!handoffKinds.includes(candidate.kind as HandoffKind)) return null;
  return {
    kind: candidate.kind as HandoffKind,
    at: typeof candidate.at === "string" ? candidate.at : "",
    sponsor: typeof candidate.sponsor === "string" ? migrateActorToken(candidate.sponsor) : "",
  };
}

export function hydrateSessionGraph(value: SessionGraph | null): SessionGraph {
  if (!value?.session) return initialSessionGraph;
  const cold = value.session.scopeMode === "cold";
  const legacyCold = cold && value.session.id !== "cold-session";
  const sessionId = cold ? "cold-session" : value.session.id;
  const partnerNote = latestPartnerNote(value.partnerNotes ?? []);
  const agenda = legacyCold
    ? (value.agenda ?? initialSessionGraph.agenda).map((step, index) => ({
        ...step,
        sessionId,
        state: index === 0 ? "active" as const : "upcoming" as const,
      }))
    : value.agenda ?? initialSessionGraph.agenda;
  const pilotPick = typeof value.outcome?.pilotPick === "string" ? value.outcome.pilotPick : null;
  const hackathonDecision = legacyCold ? null : hydrateHackathonDecision(value.outcome?.hackathonDecision);
  const outcome = legacyCold
    ? {
        ...initialSessionGraph.outcome,
        ...value.outcome,
        sessionId,
        useCase: "",
        annualValue: 0,
        nextStep: "",
        constraint: "",
        partiallyEstimated: true,
        pilotPick: null,
        hackathonDecision: null,
      }
    : { ...initialSessionGraph.outcome, ...value.outcome, sessionId, pilotPick, hackathonDecision };
  return {
    ...initialSessionGraph,
    ...value,
    session: {
      ...initialSessionGraph.session,
      ...value.session,
      id: sessionId,
      reusePriorPilotSpec: value.session.reusePriorPilotSpec ?? (cold ? null : true),
      ...(value.session.customerFormatChosen ? { customerFormatChosen: true } : {}),
      customerDoor: value.session.customerDoor === true,
      handoff: hydrateHandoff(value.session.handoff),
      focus: value.session.focus === "hackathon" ? "hackathon" : "session",
      pilotSigned: hydratePilotSigned(value.session.pilotSigned),
      fundingClaim: hydrateFundingClaim(value.session.fundingClaim),
    },
    valueInputs: migrateConfirmedBy(legacyCold
      ? emptyValueInputs(sessionId)
      : cold && !value.valueInputs?.length
        ? emptyValueInputs(sessionId)
        : value.valueInputs ?? initialSessionGraph.valueInputs),
    costComponents: migrateConfirmedBy(legacyCold
      ? emptyCostComponents()
      : cold && !value.costComponents?.length
        ? emptyCostComponents()
        : value.costComponents ?? initialSessionGraph.costComponents),
    agenda,
    captures: (legacyCold ? [] : value.captures ?? (cold ? [] : initialSessionGraph.captures)).map((capture) => (
      capture.attributedTo === legacyCustomerActor
        ? { ...capture, attributedTo: migrateActorToken(capture.attributedTo) }
        : capture
    )),
    partnerNotes: partnerNote ? [partnerNote] : [],
    attendees: cold
      ? value.attendees ?? []
      : value.attendees?.length
        ? value.attendees
        : initialSessionGraph.attendees,
    coldCompany: value.coldCompany ?? null,
    coldAttendees: value.coldAttendees ?? [],
    outcome,
    solutions: withSolutionProducts(
      value.solutions?.length ? value.solutions : initialSessionGraph.solutions,
    ),
    ranking: value.ranking?.order?.length
      ? {
          order: value.ranking.order,
          selected: Array.isArray(value.ranking.selected) ? value.ranking.selected : [],
          locked: Boolean(value.ranking.locked),
        }
      : initialSessionGraph.ranking,
    hackathon: value.hackathon
      ? {
          ...value.hackathon,
          solutionIds: Array.isArray(value.hackathon.solutionIds) ? value.hackathon.solutionIds : [],
          showcaseAt: value.hackathon.showcaseAt?.trim() || defaultShowcaseAt(value.hackathon.date ?? ""),
          calendarAdded: Boolean(value.hackathon.calendarAdded),
          meetAdded: Boolean(value.hackathon.meetAdded),
        }
      : null,
    votes: hydrateVotes(value),
    sampleRun: hydrateSampleRun(value.sampleRun),
  };
}

const sampleFieldIds = new Set<string>(sampleClaimFields.map((field) => field.id));

function hydrateSampleRun(value: unknown): SampleRun | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SampleRun>;
  if (typeof candidate.solutionId !== "string" || !candidate.solutionId.trim()) return null;
  const marks: SampleRun["marks"] = {};
  if (candidate.marks && typeof candidate.marks === "object") {
    for (const [claimId, mark] of Object.entries(candidate.marks)) {
      if (!mark || typeof mark !== "object") continue;
      const verdict = mark.verdict === "right" || mark.verdict === "fix" ? mark.verdict : null;
      if (!verdict) continue;
      const fields = verdict === "right" || !Array.isArray(mark.fields)
        ? []
        : mark.fields.filter((field): field is string => typeof field === "string" && sampleFieldIds.has(field));
      marks[claimId] = { verdict, fields };
    }
  }
  const { reviewed } = sampleRunTallies(marks);
  let status: SampleRun["status"];
  if (reviewed >= sampleClaims.length) status = "reviewed";
  else if (reviewed > 0 || candidate.status === "ran" || candidate.status === "reviewed") status = "ran";
  else status = "not-run";
  const position = typeof candidate.position === "number"
    && Number.isInteger(candidate.position)
    && candidate.position >= 0
    && candidate.position < sampleClaims.length
    ? candidate.position
    : 0;
  return {
    solutionId: candidate.solutionId,
    status,
    marks,
    position,
    reviewedBy: typeof candidate.reviewedBy === "string" ? migrateActorToken(candidate.reviewedBy) : null,
    at: typeof candidate.at === "string" ? candidate.at : null,
  };
}

function patternForIndustry(industry: string) {
  const normalized = industry.toLowerCase();
  if (/(bank|financial|fraud)/.test(normalized)) return "fraud-triage";
  if (/(contact|call centre|telecom|retail)/.test(normalized)) return "contact-centre-summarisation";
  if (/(knowledge|professional services)/.test(normalized)) return "knowledge-retrieval";
  return "document-intake";
}

export function applyColdScope(
  graph: SessionGraph,
  company: ColdCompany,
  attendees: ColdAttendee[],
): SessionGraph {
  const enteringCold = graph.session.scopeMode !== "cold";
  const sessionId = "cold-session";
  const solutions = withSolutionProducts(
    graph.solutions.length ? graph.solutions : initialSessionGraph.solutions,
  );
  return {
    ...graph,
    session: {
      ...graph.session,
      id: sessionId,
      scopeMode: "cold",
      customerName: company.name,
      customerContext: `${company.sizeBand} ${company.industry}`,
      industry: company.industry,
      patternId: patternForIndustry(company.industry),
      fundingRoute: enteringCold ? null : graph.session.fundingRoute,
      claimsVolumeChoice: enteringCold ? null : graph.session.claimsVolumeChoice,
      reusePriorPilotSpec: enteringCold ? null : graph.session.reusePriorPilotSpec,
      ledgerFrozen: enteringCold ? false : graph.session.ledgerFrozen,
    },
    coldCompany: company,
    coldAttendees: attendees,
    agenda: enteringCold
      ? graph.agenda.map((step, index) => ({
          ...step,
          sessionId,
          state: index === 0 ? "active" : "upcoming",
        }))
      : graph.agenda,
    captures: enteringCold ? [] : graph.captures,
    partnerNotes: enteringCold ? [] : graph.partnerNotes,
    valueInputs: enteringCold ? emptyValueInputs(sessionId) : graph.valueInputs,
    costComponents: enteringCold ? emptyCostComponents() : graph.costComponents,
    outcome: {
      ...graph.outcome,
      sessionId,
      useCase: enteringCold ? "" : graph.outcome.useCase,
      annualValue: enteringCold ? 0 : graph.outcome.annualValue,
      owner: attendees.find((person) => matchedColdRole(person.role)?.role === "Developer")?.name ?? null,
      nextStep: enteringCold ? "" : graph.outcome.nextStep,
      constraint: enteringCold ? "" : graph.outcome.constraint,
      partiallyEstimated: true,
      pilotPick: enteringCold ? null : graph.outcome.pilotPick,
    },
    attendees: attendees.filter((person) => person.name.trim() && person.role.trim()).map((person, index) => {
      const match = matchedColdRole(person.role);
      return {
        id: person.id?.trim() || `cold-attendee-${index + 1}`,
        name: person.name,
        role: person.role,
        reason: match?.reason ?? "Participant named during cold scope.",
        source: "inferred" as const,
        attendance: "attending" as const,
      };
    }),
    solutions,
    ranking: enteringCold
      ? { order: solutions.map((s) => s.id), selected: [], locked: false }
      : graph.ranking,
    hackathon: enteringCold ? null : graph.hackathon,
    votes: enteringCold ? {} : graph.votes,
    sampleRun: enteringCold ? null : graph.sampleRun ?? null,
  };
}

export function savePartnerNote(graph: SessionGraph, note: PartnerNote): SessionGraph {
  return {
    ...graph,
    partnerNotes: [note],
  };
}

export function saveSessionOutcome(
  graph: SessionGraph,
  update: { useCase: string; constraint: string; nextStep: string },
): SessionGraph {
  return {
    ...graph,
    outcome: {
      ...graph.outcome,
      useCase: update.useCase.trim(),
      constraint: update.constraint.trim(),
      nextStep: update.nextStep.trim(),
    },
  };
}

export function updateCapture(
  graph: SessionGraph,
  captureId: string,
  update: { attributedTo: string; text: string },
): SessionGraph {
  const text = update.text.trim();
  if (!text) return graph;
  return {
    ...graph,
    captures: graph.captures.map((capture) =>
      capture.id === captureId
        ? { ...capture, attributedTo: update.attributedTo, text }
        : capture,
    ),
  };
}

export function missingColdRoles(graph: SessionGraph) {
  if (graph.session.scopeMode !== "cold") return [];
  const pattern = patterns.find((item) => item.id === graph.session.patternId);
  if (!pattern) return [];
  const matched = new Set<string>(
    graph.coldAttendees.flatMap((person) => {
      const role = matchedColdRole(person.role);
      return role ? [role.role] : [];
    }),
  );
  return pattern.requiredRoles
    .filter((role) => !matched.has(role))
    .map((role) => ({
      role,
      reason: coldRoleRules.find((rule) => rule.role === role)?.reason ?? `Add a ${role.toLowerCase()} for this pattern.`,
    }));
}

export function shouldResetGraph(_pathname: string) {
  void _pathname;
  return false;
}

export function isQualified(graph: SessionGraph) {
  return hasCompleteValueInputs(graph) && graph.valueInputs.every((input) => input.respondentConfirmed) && Boolean(graph.outcome.owner);
}

export function hasCompleteValueInputs(graph: SessionGraph) {
  return ["claims", "delay", "handling"].every((id) => {
    const quantity = graph.valueInputs.find((input) => input.id === id)?.quantity;
    return typeof quantity === "number" && Number.isFinite(quantity);
  });
}

export function hasCompleteCostComponents(graph: SessionGraph) {
  return graph.costComponents.length > 0 && graph.costComponents.every((component) =>
    component.inputs.length > 0 && component.inputs.every((input) =>
      typeof input.quantity === "number" && Number.isFinite(input.quantity),
    ),
  );
}

export function applyDeliveryMode(graph: SessionGraph, delivery: Delivery): SessionGraph {
  if (graph.session.delivery === delivery) return graph;

  const valueInputs = graph.valueInputs.map((input) =>
    delivery === "self-service"
      ? { ...input, confirmedBy: null, respondentConfirmed: true }
      : graph.session.scopeMode === "cold"
        ? { ...input, confirmedBy: null }
      : {
          ...input,
          confirmedBy: input.id === "delay" ? "Dana Reyes" : "Michelle Dorsey",
          respondentConfirmed: true,
        },
  );
  const facilitator =
    delivery === "self-service"
      ? null
      : delivery === "google-facilitated"
        ? { name: "Priya Raghavan", title: "Google Partner Development Manager" }
        : { name: "Ravi Menon", title: "Solution Specialist, AI & Data" };
  const next = {
    ...graph,
    session: {
      ...graph.session,
      delivery,
      facilitator,
      qualified: false,
    },
    valueInputs,
  };
  const qualified = delivery === "self-service" ? isQualified(next) : false;
  return bindAnnualValue({
    ...next,
    session: { ...next.session, qualified },
  });
}

export function updateValueConfirmer(
  graph: SessionGraph,
  inputId: string,
  confirmer: string | null,
): SessionGraph {
  return {
    ...graph,
    valueInputs: graph.valueInputs.map((input) =>
      input.id === inputId ? { ...input, confirmedBy: confirmer } : input,
    ),
  };
}

export function applyMechanic(graph: SessionGraph, mechanic: Mechanic): SessionGraph {
  // Once the hackathon is booked the mechanic is settled.
  if (graph.hackathon?.booked) return graph;
  // A partner-led session only moves to the ledger once the value inputs exist.
  // The customer door flips to self-service first, so it can still choose the ledger and enter the numbers there.
  if (mechanic === "ghost-ledger" && graph.session.delivery !== "self-service" && !hasCompleteValueInputs(graph)) {
    return graph;
  }
  const next = bindAnnualValue({
    ...graph,
    session: { ...graph.session, mechanic, ledgerFrozen: false },
  });
  const allowed = new Set(solutionIdsForMechanic(mechanic));
  return releaseStaleSampleRun({
    ...next,
    ranking: {
      ...next.ranking,
      selected: next.ranking.selected.filter((id) => allowed.has(id)),
    },
  });
}

/** Customer door: choosing a format starts the customer's own session on the one graph. */
export function chooseCustomerFormat(graph: SessionGraph, mechanic: Mechanic): SessionGraph {
  if (graph.hackathon?.booked) return graph;
  const next = applyMechanic(applyDeliveryMode(graph, "self-service"), mechanic);
  const firstChoice = !graph.session.customerFormatChosen;
  return {
    ...next,
    session: { ...next.session, customerFormatChosen: true },
    // The seeded agenda state belongs to Heartland's session; the customer starts from Scope.
    agenda: firstChoice
      ? next.agenda.map((step) => ({ ...step, state: "upcoming" as const }))
      : next.agenda,
  };
}

export const customerFormatLabels: Record<Mechanic, string> = {
  "value-sprint": "Prioritize my use cases",
  "ghost-ledger": "Show me the cost of waiting",
};

export function fundingRouteLabel(route: Session["fundingRoute"]) {
  if (route === "invite-karen") return "Karen is in the room";
  if (route === "brief-dana") return "Dana carries the ask";
  return "Not started";
}

export type CustomerHomeSummary = {
  started: boolean;
  company: string;
  format: string | null;
  stage: string;
  partner: string;
  annualValue: number | null;
  funding: string;
  continueHref: "/scope" | "/run" | null;
};

/** The customer has named a company in cold scope. A seeded graph is not their account. */
export function customerHasAccount(actor: Actor, graph: SessionGraph) {
  return isCustomerViewer(actor) && graph.session.scopeMode === "cold" && graph.session.customerName.trim().length > 0;
}

/** Company name already on this session. Seeded Heartland counts; a blank cold start does not. */
export function sessionHasNamedCompany(graph: SessionGraph) {
  return graph.session.customerName.trim().length > 0;
}

/** This engagement only. Never treats the seeded Heartland graph as the customer's session. */
export function customerHomeSummary(graph: SessionGraph, partnerName: string): CustomerHomeSummary {
  const started = Boolean(graph.session.customerFormatChosen);
  const lookedUp = graph.session.scopeMode === "cold";
  const company = lookedUp ? graph.session.customerName : "No account yet";
  const activeStep = started ? agendaForSession(graph).find((step) => step.state === "active") ?? null : null;
  const annualValue = started && lookedUp && hasCompleteValueInputs(graph) ? graph.outcome.annualValue : null;
  return {
    started,
    company,
    format: started ? customerFormatLabels[graph.session.mechanic] : null,
    stage: !started ? "Not started" : graph.outcome.hackathonDecision === "go" && pilotPickTitle(graph) ? "Pilot scoped" : activeStep ? activeStep.title : "Scope",
    partner: partnerName,
    annualValue,
    funding: fundingRouteLabel(graph.session.fundingRoute),
    continueHref: !started ? null : activeStep ? "/run" : "/scope",
  };
}

/** Latest capture on the active step, else on the most recent done step. Null when none. */
export function latestStepCapture(graph: SessionGraph): Capture | null {
  const active = graph.agenda.find((step) => step.state === "active");
  const done = [...graph.agenda].filter((step) => step.state === "done").sort((a, b) => b.order - a.order);
  const candidates = [active, ...done].filter((step): step is AgendaStep => Boolean(step));
  for (const step of candidates) {
    const captures = graph.captures
      .filter((capture) => capture.stepId === step.id)
      .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
    if (captures[0]) return captures[0];
  }
  return null;
}

export function applyCloseStyle(graph: SessionGraph, closeStyle: CloseStyle): SessionGraph {
  return {
    ...graph,
    session: { ...graph.session, closeStyle },
  };
}

export function customerSponsor(graph: SessionGraph) {
  return graph.attendees.find((attendee) =>
    attendee.attendance === "attending" && /sponsor/i.test(attendee.reason),
  ) ?? graph.attendees.find((attendee) => attendee.attendance === "attending");
}

export function agendaForSession(graph: SessionGraph) {
  return graph.agenda.map((step) => {
    if (step.id === "volume-and-cost" && graph.session.mechanic === "ghost-ledger") {
      return {
        ...step,
        title: "Build the ledger",
        prompt: "What do tool spend, overtime, rework rate, and review hours cost today?",
      };
    }
    if (step.id === "owner-and-ask" && graph.session.closeStyle === "board-slide") {
      return {
        ...step,
        title: "The board slide",
        prompt: "It's March. The pilot worked. Dana, what do you tell your board?",
        subPrompt: "Capture the answer verbatim. Their words, not a summary.",
      };
    }
    if (step.id === "owner-and-ask" && graph.session.fundingRoute === "brief-dana") {
      return {
        ...step,
        prompt: "Who owns this, and can Dana carry the funding ask to Karen?",
      };
    }
    if (step.id === "owner-and-ask" && graph.session.scopeMode === "cold") {
      return {
        ...step,
        prompt: "Who owns this, and who can fund the pilot?",
      };
    }
    return step;
  });
}

export function preworkForMechanic(mechanic: Mechanic) {
  if (mechanic !== "ghost-ledger") return prework;
  return [
    ...prework,
    "Bring the current tool spend for claims intake.",
    "Bring recent overtime spend tied to intake volume.",
    "Estimate the current rework rate.",
    "Estimate weekly review hours for low-confidence claims.",
  ];
}

export function pdmPartnerInvitationCopy(brand: Brand, customerName = "Heartland Mutual Insurance") {
  return `Hi Ravi,

${customerName} looks ready for a focused value session on an account you own. Run it with the customer team to turn the opportunity into a scoped six-week pilot.

There is partner development funding available if the evidence supports the pilot, and the resulting business case carries ${brand.partnerName}'s brand. You keep the customer relationship and the next step.

Regards,
Priya Raghavan · Platform vendor`;
}

const legacyCustomerActor = "c\u0070m";

export function migrateStoredActor(value: string | null): Actor | null {
  if (value === legacyCustomerActor || value === "customer") return "customer";
  if (value === "pdm" || value === "partner") return value;
  return null;
}

function migrateActorToken(value: string) {
  return value === legacyCustomerActor ? "customer" : value;
}

function migrateVoteKeys(votes: unknown): Record<string, string> {
  if (!votes || typeof votes !== "object") return {};
  const next: Record<string, string> = {};
  for (const [key, solutionId] of Object.entries(votes)) {
    if (typeof solutionId !== "string") continue;
    next[migrateActorToken(key)] = solutionId;
  }
  return next;
}

/** Empty seeded sessions show the room's indication. A cold account starts with none. */
function hydrateVotes(value: { votes?: unknown; session?: { scopeMode?: string } }): Record<string, string> {
  const votes = migrateVoteKeys(value.votes);
  if (Object.keys(votes).length > 0) return votes;
  if (value.session?.scopeMode === "cold") return {};
  return { ...initialSessionGraph.votes };
}

function migrateConfirmedBy<T extends { confirmedBy: string | null }>(rows: T[]): T[] {
  return rows.map((row) => (
    row.confirmedBy === legacyCustomerActor
      ? { ...row, confirmedBy: "customer" }
      : row
  ));
}

export function customerGreeting(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first ? `Hello, ${first}` : "Welcome";
}

export function viewingAsCustomerLabel(name: string) {
  const trimmed = name.trim();
  return trimmed ? `${trimmed} · customer` : "Customer";
}

function customerPerson(graph: SessionGraph): { name: string; org: string } {
  if (graph.session.scopeMode !== "cold") {
    return { name: "Dana Reyes", org: "Heartland Mutual Insurance" };
  }
  const entered = [...graph.coldAttendees, ...graph.attendees].find((person) => person.name.trim());
  return {
    name: entered?.name.trim() ?? "",
    org: graph.session.customerName.trim(),
  };
}

export function viewerForActor(actor: Actor, brand: Brand, graph: SessionGraph = initialSessionGraph): Viewer {
  if (actor === "pdm") {
    return { actor, name: "Priya Raghavan", org: "Platform vendor" };
  }
  if (isCustomerViewer(actor)) {
    const person = customerPerson(graph);
    return { actor, name: person.name, org: person.org };
  }
  return { actor, name: "Ravi Menon", org: brand.partnerName };
}

export function isCustomerViewer(actor: Actor) {
  return actor === "customer";
}

export function isSessionReadOnly(actor: Actor, graph: SessionGraph) {
  if (!isCustomerViewer(actor)) return false;
  // Customer can run a self-service or cold session. A facilitated Heartland record stays the partner's evidence.
  return graph.session.delivery !== "self-service" && graph.session.scopeMode !== "cold";
}

/** Customer edits when the session is not read-only. Partner edits a facilitated session that is not the customer door. */
export function canMutateSampleRun(actor: Actor, graph: SessionGraph) {
  if (actor === "pdm") return false;
  if (isCustomerViewer(actor)) return !isSessionReadOnly(actor, graph);
  return actor === "partner" && graph.session.delivery === "facilitated" && graph.session.customerDoor !== true;
}

/** Read-only customers can still move between claims. The partner status panel and the PDM do not. */
export function canSetSamplePosition(actor: Actor, graph: SessionGraph) {
  if (!graph.sampleRun) return false;
  if (actor === "pdm") return false;
  if (actor === "partner") return canMutateSampleRun(actor, graph);
  return isCustomerViewer(actor);
}

/** Partner-led session the customer is sitting in. The Customer card opens the door instead. */
export function isCustomerAttending(actor: Actor, graph: SessionGraph) {
  return isSessionReadOnly(actor, graph) && graph.session.customerDoor !== true;
}

export function canViewPartnerScope(actor: Actor) {
  return actor === "partner" || actor === "pdm";
}

/** The partner, the customer, or the Google PDM books the three days. */
export function canBookHackathon(actor: Actor) {
  return actor === "partner" || actor === "pdm" || isCustomerViewer(actor);
}

export const hackathonGuardCopy = "A hackathon follows a value session. Run one first.";

/** Writes only session.focus. Booking, the shortlist, and the pilot pick stay as they are. */
export function setSessionFocus(graph: SessionGraph, focus: SessionFocus): SessionGraph {
  if (graph.session.focus === focus) return graph;
  return { ...graph, session: { ...graph.session, focus } };
}

/** The run is finished, or the solution is already chosen. Never substitutes the Heartland record. */
export function sessionReachedShortlist(graph: SessionGraph) {
  const runFinished = graph.agenda.length > 0 && graph.agenda.every((step) => step.state === "done");
  return runFinished || graph.ranking.selected.length === 3 || Boolean(graph.hackathon?.booked);
}

/** Earliest step that is still open. Used only by the hackathon guard. */
export function earliestIncompleteStep(graph: SessionGraph): { href: string; label: string } {
  const named = graph.session.scopeMode === "seeded" || graph.session.customerName.trim().length > 0;
  if (!named) return { href: "/scope", label: "Scope" };
  const started = graph.agenda.some((step) => step.state !== "upcoming");
  if (!started) return { href: "/plan", label: "Plan" };
  return { href: "/run", label: "Run" };
}

/** Why booking is unavailable, or null when the viewer may open the booking form. */
export function bookBlockReason(actor: Actor, graph: SessionGraph): string | null {
  if (!canBookHackathon(actor)) return "The partner or customer books the hackathon.";
  if (graph.ranking.selected.length !== 3) return "Choose three first.";
  if (actor === "partner" && graph.session.delivery !== "self-service" && !graph.ranking.locked) return "The partner agrees the three first.";
  return null;
}

/** The partner, the Google PDM, and the customer choose. Locked and booked shortlists stay fixed. */
export function canChooseShortlist(actor: Actor, graph: SessionGraph) {
  if (graph.ranking.locked || graph.hackathon?.booked) return false;
  if (actor === "partner" || actor === "pdm") return true;
  return isCustomerViewer(actor);
}

export function canConfirmShortlist(actor: Actor, graph: SessionGraph) {
  if (graph.hackathon?.booked || graph.ranking.locked) return false;
  if (graph.ranking.selected.length !== 3) return false;
  if (graph.session.delivery === "self-service") return false;
  return actor === "partner";
}

export function canUnconfirmShortlist(actor: Actor, graph: SessionGraph) {
  if (!graph.ranking.locked || graph.hackathon?.booked) return false;
  if (actor === "partner") return true;
  if (graph.session.delivery === "self-service") return isCustomerViewer(actor);
  return false;
}

/** Partner records the decision. On self-service the customer does. The PDM sees it. */
export function canRecordHackathonDecision(actor: Actor, graph: SessionGraph) {
  if (!graph.hackathon?.booked || actor === "pdm") return false;
  if (isCustomerViewer(actor)) return graph.session.delivery === "self-service";
  return actor === "partner";
}

export function bindAnnualValue(graph: SessionGraph): SessionGraph {
  const claims = graph.valueInputs.find((input) => input.id === "claims")?.quantity ?? 0;
  const delay = graph.valueInputs.find((input) => input.id === "delay")?.quantity ?? 0;
  const handling = graph.valueInputs.find((input) => input.id === "handling")?.quantity ?? 0;
  const annualValue = graph.session.mechanic === "ghost-ledger"
    ? hasCompleteCostComponents(graph) ? ledgerAnnualTotal(graph.costComponents) : 0
    : hasCompleteValueInputs(graph) ? calculateAnnualValue(claims, delay, handling) : 0;
  return { ...graph, outcome: { ...graph.outcome, annualValue } };
}

export function applyClaimsVolumeChoice(graph: SessionGraph, choice: ClaimsVolumeChoice): SessionGraph {
  if (choice === "exact" && graph.session.claimsVolumeChoice === "exact") return graph;

  const quantity = choice === "exact" ? null : choice === "range-250-500" ? 375 : 400;
  const confirmedBy = choice === "unconfirmed" || choice === "exact"
    ? null
    : graph.valueInputs.find((input) => input.id === "claims")?.confirmedBy ?? "Michelle Dorsey";
  const valueInputs = graph.valueInputs.map((input) =>
    input.id === "claims"
      ? {
          ...input,
          quantity,
          confirmedBy,
          respondentConfirmed: choice !== "unconfirmed" && choice !== "exact",
        }
      : input,
  );
  const costComponents = graph.costComponents.map((component) => ({
    ...component,
    inputs: component.inputs.map((input) =>
      input.label === "Claims per day" ? { ...input, quantity } : input,
    ),
  }));
  return bindAnnualValue({
    ...graph,
    session: { ...graph.session, claimsVolumeChoice: choice, ledgerFrozen: false },
    valueInputs,
    costComponents,
    outcome: { ...graph.outcome, partiallyEstimated: choice !== "about-400" },
  });
}

export function isValidExactClaimsVolume(quantity: number | null) {
  return typeof quantity === "number"
    && Number.isSafeInteger(quantity)
    && quantity > 0;
}

export function applyExactClaimsVolume(graph: SessionGraph, quantity: number | null): SessionGraph {
  if (graph.session.claimsVolumeChoice !== "exact") return graph;
  const validQuantity = isValidExactClaimsVolume(quantity) ? quantity : null;
  const valueInputs = graph.valueInputs.map((input) =>
    input.id === "claims"
      ? {
          ...input,
          quantity: validQuantity,
          confirmedBy: null,
          respondentConfirmed: false,
        }
      : input,
  );
  const costComponents = graph.costComponents.map((component) => ({
    ...component,
    inputs: component.inputs.map((input) =>
      input.label === "Claims per day" ? { ...input, quantity: validQuantity } : input,
    ),
  }));
  return bindAnnualValue({
    ...graph,
    session: { ...graph.session, ledgerFrozen: false },
    valueInputs,
    costComponents,
    outcome: { ...graph.outcome, partiallyEstimated: true },
  });
}

export function claimsPayoffCopy(graph: SessionGraph) {
  const claims = graph.valueInputs.find((input) => input.id === "claims");
  const delay = graph.valueInputs.find((input) => input.id === "delay");
  const handling = graph.valueInputs.find((input) => input.id === "handling");
  if (!claims || !delay || !handling || !hasCompleteValueInputs(graph)) return "";
  if (graph.session.claimsVolumeChoice === "exact") {
    const daily = formatCurrency(calculateDailyValue(claims.quantity!, delay.quantity!, handling.quantity!));
    const millions = (calculateAnnualValue(claims.quantity!, delay.quantity!, handling.quantity!) / 1_000_000).toFixed(2).replace(/\.00$/, "");
    return `${claims.quantity} × ${delay.quantity} × ${formatPreciseCurrency(handling.quantity!)} → ${daily}/day · $${millions}M/year`;
  }
  if (!claims.confirmedBy) {
    return "Artifact will label this an unconfirmed estimate.";
  }
  if (graph.session.claimsVolumeChoice === "range-250-500") {
    return "250–500 × 2 × $38.75 → $19,000–$39,000/day · $4.8M–$9.7M/year · spans the library range";
  }
  const daily = formatCurrency(calculateDailyValue(claims.quantity!, delay.quantity!, handling.quantity!));
  const millions = (calculateAnnualValue(claims.quantity!, delay.quantity!, handling.quantity!) / 1_000_000).toFixed(2).replace(/\.00$/, "");
  const estimate = `${claims.quantity} × ${delay.quantity} × ${formatPreciseCurrency(handling.quantity!)} → ${daily}/day · $${millions}M/year`;
  return `${estimate} · top of the library range`;
}

export function claimsVolumeProvenanceCopy(graph: SessionGraph) {
  if (graph.session.claimsVolumeChoice === "exact") {
    return "Volume entered by partner in Scope · not respondent-confirmed";
  }
  if (graph.session.claimsVolumeChoice === "range-250-500") {
    return "Volume supplied as a range · midpoint used only for planning inputs.";
  }
  if (graph.session.claimsVolumeChoice === "unconfirmed") {
    return "No respondent confirmation yet.";
  }
  if (graph.session.delivery === "self-service") {
    return "Respondent-confirmed · not facilitator-verified";
  }
  const claims = graph.valueInputs.find((input) => input.id === "claims");
  return claims?.confirmedBy
    ? inputsConfirmedByCopy(graph)
    : "Volume is an unconfirmed estimate from scope.";
}

export function inputsConfirmedByCopy(graph: SessionGraph) {
  const names = [...new Set(graph.valueInputs.flatMap((input) => (input.confirmedBy ? [input.confirmedBy] : [])))];
  if (names.length === 0) return "Volume is an unconfirmed estimate from scope.";
  if (names.length === 1) return `Inputs confirmed by ${names[0]}.`;
  if (names.length === 2) return `Inputs confirmed by ${names[0]} and ${names[1]}.`;
  return `Inputs confirmed by ${names.slice(0, -1).join(", ")}, and ${names.at(-1)}.`;
}

export function artifactLimitsCopy(graph: SessionGraph) {
  const dateLine = graph.hackathon?.booked && graph.hackathon.date
    ? ` The three-day hackathon on ${graph.hackathon.date} exists to answer these and to scope the six-week pilot.`
    : " The three-day hackathon exists to answer these and to scope the six-week pilot.";
  return {
    heading: "What this case does not yet prove",
    body: `Extraction accuracy on Heartland's own forms, including handwritten adjuster notes. Whether the 15% Michelle flagged behaves as her team expects. Actual review time once fields are pre-filled.${dateLine}`,
  };
}

export function artifactHeadline(useCase: string) {
  if (!useCase.trim()) return "Business case awaiting session evidence";
  const sentenceCase = useCase.toLowerCase().replace(/\bai-assisted\b/, "AI-assisted");
  return `A grounded case for ${sentenceCase}`;
}

export function artifactPilotScopeCopy(graph: SessionGraph, brand: Brand) {
  if (graph.session.scopeMode === "cold" && !graph.outcome.nextStep.trim()) return "Not yet defined";
  const base = "AI-assisted extraction from 500 anonymised claims";
  if (graph.session.reusePriorPilotSpec === false) return `${base}; starts a fresh pilot spec`;
  return `${base}; reuses ${brand.partnerName}'s prior document-pattern pilot spec`;
}

export function canFlagReferenceStory(actor: Actor) {
  return actor === "pdm";
}

export function artifactActions(actor: Actor, qualified: boolean, delivery: Delivery) {
  if (actor === "partner") {
    if (delivery === "self-service") {
      return {
        primary: "Request a facilitated session",
        secondary: "Start DAF funding request",
        tertiary: "Contact my partner manager with this business case",
      };
    }
    return {
      primary: "Start DAF funding request",
      secondary: qualified ? "Request a facilitated session" : null,
      tertiary: "Contact my partner manager with this business case",
    };
  }
  if (isCustomerViewer(actor)) {
    return { primary: null, secondary: null, tertiary: null };
  }
  return {
    primary: "Review funding request",
    secondary: null,
    tertiary: null,
  };
}

export function claimsArtifactCopy(graph: SessionGraph) {
  const claims = graph.valueInputs.find((input) => input.id === "claims");
  const delay = graph.valueInputs.find((input) => input.id === "delay");
  const handling = graph.valueInputs.find((input) => input.id === "handling");
  if (!claims || !delay || !handling || !hasCompleteValueInputs(graph)) {
    return {
      headline: "Value inputs not captured yet",
      detail: "Add claims volume, avoidable delay, and handling cost during the session before calculating value.",
      status: null,
    };
  }
  if (graph.session.claimsVolumeChoice === "unconfirmed") {
    return {
      headline: "Value pending volume confirmation",
      detail: "Claims volume was not confirmed in Scope. Confirm it before using a point estimate in the funding case.",
      status: "Unconfirmed estimate",
    };
  }
  if (graph.session.claimsVolumeChoice === "range-250-500") {
    return {
      headline: "$19,000–$39,000 / day",
      detail: "250–500 claims per day × 2 avoidable days × $38.75 handling cost. At 250 working days, that is $4.8M–$9.7M per year.",
      status: "Range estimate · spans the library range",
    };
  }
  const daily = formatCurrency(calculateDailyValue(claims.quantity!, delay.quantity!, handling.quantity!));
  return {
    headline: `${claims.quantity} × ${delay.quantity} × ${formatPreciseCurrency(handling.quantity!)} = ${daily} / day`,
    detail: `${claims.quantity} claims per day × ${delay.quantity} avoidable days × ${formatPreciseCurrency(handling.quantity!)} handling cost. At 250 working days, that is ${formatCurrency(graph.outcome.annualValue)} per year.`,
    status: null,
  };
}

export function applyFundingRoute(graph: SessionGraph, route: FundingRoute): SessionGraph {
  return {
    ...graph,
    session: { ...graph.session, fundingRoute: route },
    attendees: graph.attendees.map((person) =>
      person.id === "karen"
        ? route === "invite-karen"
          ? { ...person, attendance: "attending", reason: "Economic buyer · invited" }
          : { ...person, attendance: "invited-not-attending", reason: "not attending — Dana carries the ask" }
        : person,
    ),
  };
}

export function fundingAskCopy(graph: SessionGraph) {
  const bookedTitles = bookedSolutionTitles(graph);
  const bookedLabel = bookedTitles.length
    ? ` on ${bookedTitles.join(", ")}`
    : "";
  if (graph.session.scopeMode === "cold") {
    const economicBuyer = graph.attendees.find((attendee) => /cfo|finance|economic buyer|executive sponsor/i.test(attendee.role));
    const technicalOwner = graph.attendees.find((attendee) => /developer|engineer|technical lead/i.test(attendee.role));
    if (!economicBuyer) {
      return "Confirm an economic buyer before requesting funding that substantiates the hackathon booking.";
    }
    return `${economicBuyer.name}: substantiate the three-day hackathon${bookedLabel}${technicalOwner ? ` and confirm ${technicalOwner.name} will be in the room` : ""}.`;
  }
  if (graph.session.fundingRoute === "brief-dana") {
    return `Dana Reyes: carry the funding ask. Brief Karen so she can substantiate the three-day hackathon${bookedLabel} and confirm Alex Chen joins the room.`;
  }
  return `Karen Whitfield, CFO: substantiate the three-day hackathon${bookedLabel} and confirm Alex Chen joins the room.`;
}

export function solutionIdsForMechanic(mechanic: Mechanic): string[] {
  return mechanic === "ghost-ledger"
    ? [...ledgerSolutionIds]
    : [...businessCaseSolutionIds];
}

export function catalogSolutionById(id: string, graph?: SessionGraph): SolutionCandidate | undefined {
  const fromGraph = graph
    ? withSolutionProducts(graph.solutions).find((solution) => solution.id === id)
    : undefined;
  if (fromGraph) return fromGraph;
  return withSolutionProducts(heartlandSolutions).find((solution) => solution.id === id);
}

export function bookedSolutionTitles(graph: SessionGraph): string[] {
  const ids = graph.hackathon?.solutionIds ?? [];
  return ids
    .map((id) => catalogSolutionById(id, graph)?.title)
    .filter((title): title is string => Boolean(title));
}

/** Cloud products named on the three booked solutions, de-duplicated in catalog order. */
export function bookedSolutionProducts(graph: SessionGraph): string[] {
  const seen = new Set<string>();
  const products: string[] = [];
  for (const id of graph.hackathon?.solutionIds ?? []) {
    for (const product of catalogSolutionById(id, graph)?.products ?? []) {
      if (seen.has(product)) continue;
      seen.add(product);
      products.push(product);
    }
  }
  return products;
}

export type GoogleStackItem = {
  product: string;
  role: string;
};

/** Role of each named product in the three-day build. Shared by the stack and the rank chips. */
export const googleProductRoles: Record<string, string> = {
  Gemini: "Solution approaches for the three booked rows",
  "Document AI": "Form and PDF extraction on the customer's documents",
  "Vertex AI": "Model and evaluation work during the three days",
  "Vertex AI Search": "Grounded retrieval over claims knowledge",
  "Cloud Logging": "Audit trail for automated decisions",
};

/** Narrative Google stack for a booked hackathon: solution products plus Calendar and Meet. */
export function hackathonGoogleStack(graph: SessionGraph): GoogleStackItem[] {
  if (!graph.hackathon?.booked) return [];
  const items: GoogleStackItem[] = bookedSolutionProducts(graph).map((product) => ({
    product,
    role: googleProductRoles[product] ?? "Google Cloud capability used in the three-day build",
  }));
  items.push({
    product: "Google Calendar",
    role: "Hold the three-day window for the room",
  });
  items.push({
    product: "Google Meet",
    role: "Facilitated room with the platform facilitator",
  });
  return items;
}

function shiftIsoDate(isoDate: string, dayOffset: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatCalendarDay(isoDate: string, dayOffset = 0): string {
  return shiftIsoDate(isoDate, dayOffset).replaceAll("-", "");
}

/** Solution showcase default: 14:00 on the third day of the hackathon. Empty when no date. */
export function defaultShowcaseAt(hackathonDate: string): string {
  const date = hackathonDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  return `${shiftIsoDate(date, 2)}T14:00`;
}

/** "2026-10-16T14:00" → "2026-10-16 · 14:00" for the dashboard. */
export function showcaseLabel(showcaseAt: string): string {
  const [date, time] = showcaseAt.split("T");
  return time ? `${date} · ${time}` : showcaseAt;
}

/** "2026-10-14" → "2026-10-14 to 2026-10-16", the three hackathon days. */
export function hackathonDaysLabel(hackathonDate: string): string {
  const date = hackathonDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return `${date} to ${shiftIsoDate(date, 2)}`;
}

export type BookedSolutionPain = { id: string; title: string; pain: string };

/**
 * The three booked titles with the pain line each answers: the latest capture on the
 * session step that named the solution, else the solution's outcome line.
 */
export function bookedSolutionPains(graph: SessionGraph): BookedSolutionPain[] {
  return (graph.hackathon?.solutionIds ?? []).flatMap((id) => {
    const solution = catalogSolutionById(id, graph);
    if (!solution) return [];
    const latest = graph.captures
      .filter((capture) => capture.stepId === solution.stepId)
      .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))[0];
    return [{ id, title: solution.title, pain: latest?.text ?? solution.outcome }];
  });
}

/** Pilot spec use case: the picked title, else the booked titles, else not captured. Never the raw outcome fragment. */
export function pilotSpecUseCase(graph: SessionGraph): string {
  const picked = pilotPickTitle(graph);
  if (picked) return picked;
  const titles = bookedSolutionTitles(graph);
  if (titles.length) return titles.join(", ");
  return "Not captured yet";
}

/** Title of the solution named as the six-week pilot. Null until Go is recorded. */
export function pilotPickTitle(graph: SessionGraph): string | null {
  const pick = graph.outcome.pilotPick;
  if (!pick || !graph.hackathon?.booked || !graph.hackathon.solutionIds.includes(pick)) return null;
  return catalogSolutionById(pick, graph)?.title ?? null;
}

/** Go on one of the three booked solutions. */
export function setPilotPick(graph: SessionGraph, solutionId: string): SessionGraph {
  if (!graph.hackathon?.booked || !graph.hackathon.solutionIds.includes(solutionId)) return graph;
  if (graph.session.pilotSigned) return graph;
  if (graph.outcome.pilotPick === solutionId && graph.outcome.hackathonDecision === "go") return graph;
  return { ...graph, outcome: { ...graph.outcome, pilotPick: solutionId, hackathonDecision: "go" } };
}

export function recordNotGoingAhead(graph: SessionGraph): SessionGraph {
  if (!graph.hackathon?.booked || graph.session.pilotSigned) return graph;
  if (graph.outcome.hackathonDecision === "not-going-ahead" && !graph.outcome.pilotPick) return graph;
  return { ...graph, outcome: { ...graph.outcome, pilotPick: null, hackathonDecision: "not-going-ahead" } };
}

/** After Go, records who marked the pilot signed. A second call keeps the first record. */
export function markPilotSigned(graph: SessionGraph, recordedBy: string): SessionGraph {
  const name = recordedBy.trim();
  if (!name || graph.session.pilotSigned) return graph;
  if (graph.outcome.hackathonDecision !== "go" || !graph.outcome.pilotPick) return graph;
  return {
    ...graph,
    session: {
      ...graph.session,
      pilotSigned: { at: new Date().toISOString(), recordedBy: name },
    },
  };
}

/** Illustrative hackathon-scale claim. Frozen; not derived from the value figure. */
export const fundingClaimAmount = ILLUSTRATIVE_FUND_PER_CLAIM;

/** Partner records the funding submission, once. A second call keeps the first record. */
export function submitFundingClaim(graph: SessionGraph, recordedBy: string): SessionGraph {
  const name = recordedBy.trim();
  if (!name || graph.session.fundingClaim) return graph;
  return {
    ...graph,
    session: {
      ...graph.session,
      fundingClaim: { at: new Date().toISOString(), recordedBy: name, amount: fundingClaimAmount },
    },
  };
}

/** Partner records what happened after the room, once. A second call returns the same graph. */
export function recordHandoff(graph: SessionGraph, kind: HandoffKind): SessionGraph {
  if (graph.session.handoff) return graph;
  const sponsor = graph.outcome.owner ?? customerSponsor(graph)?.name ?? "";
  return {
    ...graph,
    session: {
      ...graph.session,
      handoff: { kind, at: new Date().toISOString(), sponsor },
    },
  };
}

export function handoffLabel(handoff: Handoff | null) {
  if (!handoff) return "Not yet handed off";
  if (handoff.kind === "daf") return "DAF with the partner";
  if (handoff.kind === "pilot") return "Pilot filed";
  return "PDM notified";
}

/** Business-case next step: the booked solution once Go is recorded, otherwise the session's own line. */
export function pilotNextStepCopy(graph: SessionGraph): string {
  const title = graph.outcome.hackathonDecision === "go" ? pilotPickTitle(graph) : null;
  return title ? `Six-week pilot on ${title}` : graph.outcome.nextStep;
}

/** Pilot-spec scope line once Go is recorded. Null until then. */
export function pilotScopeLine(graph: SessionGraph): string | null {
  const title = graph.outcome.hackathonDecision === "go" ? pilotPickTitle(graph) : null;
  return title ? `Six-week pilot on ${title}, scoped in the three-day hackathon.` : null;
}

/** Google Calendar template URL (no OAuth). Empty when the hackathon is not booked. */
export function googleCalendarComposeUrl(graph: SessionGraph, partnerName?: string): string {
  const booking = graph.hackathon;
  if (!booking?.booked || !booking.date.trim()) return "";
  const titles = bookedSolutionTitles(graph);
  const text = `${graph.session.customerName} · 3-day hackathon`;
  const details = [
    booking.question,
    "",
    titles.length ? `Solutions: ${titles.join("; ")}` : "Three selected solutions",
    ...(partnerName ? [`Partner: ${partnerName}`] : []),
    `Platform facilitator: ${booking.googleFacilitator}`,
    `Partner specialist: ${booking.partnerSpecialist}`,
    `Customer owner: ${booking.customerOwner}`,
    ...(booking.showcaseAt ? [`Showcase: ${booking.showcaseAt}`] : []),
    "",
    "Join with Google Meet — scheduled by the facilitator.",
    "These three days run on Google Cloud and Workspace.",
  ].join("\n");
  const start = formatCalendarDay(booking.date);
  const end = formatCalendarDay(booking.date, 3);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    details,
    dates: `${start}/${end}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Instant Google Meet room (no OAuth). Empty when the hackathon is not booked. */
export function googleMeetUrl(graph: SessionGraph): string {
  if (!graph.hackathon?.booked) return "";
  return "https://meet.google.com/new";
}

export function rankedSolutions(graph: SessionGraph) {
  const allowed = new Set(solutionIdsForMechanic(graph.session.mechanic));
  const byId = new Map(withSolutionProducts(graph.solutions).map((solution) => [solution.id, solution]));
  return graph.ranking.order
    .filter((id) => allowed.has(id))
    .map((id) => byId.get(id))
    .filter((solution): solution is NonNullable<typeof solution> => Boolean(solution));
}

/** Every prepared solution, in shortlist order. The mechanic filter does not hide rows. */
export function shortlistSolutions(graph: SessionGraph) {
  const byId = new Map(withSolutionProducts(graph.solutions).map((solution) => [solution.id, solution]));
  return graph.ranking.order
    .map((id) => byId.get(id))
    .filter((solution): solution is NonNullable<typeof solution> => Boolean(solution));
}

/** Selected solutions in current ranking.order. Empty when nothing selected. */
export function selectedSolutions(graph: SessionGraph) {
  const selected = new Set(graph.ranking.selected);
  const byId = new Map(withSolutionProducts(graph.solutions).map((solution) => [solution.id, solution]));
  return graph.ranking.order
    .filter((id) => selected.has(id))
    .map((id) => byId.get(id))
    .filter((solution): solution is NonNullable<typeof solution> => Boolean(solution));
}

export function toggleSelected(graph: SessionGraph, solutionId: string): SessionGraph {
  if (graph.ranking.locked || graph.hackathon?.booked) return graph;
  if (!graph.ranking.order.includes(solutionId)) return graph;
  const selected = graph.ranking.selected;
  if (selected.includes(solutionId)) {
    return releaseStaleSampleRun({
      ...graph,
      ranking: {
        ...graph.ranking,
        selected: selected.filter((id) => id !== solutionId),
      },
    });
  }
  if (selected.length >= 3) return graph;
  const nextSelected = [...selected, solutionId];
  const next = releaseStaleSampleRun({
    ...graph,
    ranking: {
      ...graph.ranking,
      selected: nextSelected,
    },
  });
  if (nextSelected.length === 3 && graph.session.delivery === "self-service") return lockRanking(next);
  return next;
}

export function castVote(graph: SessionGraph, attendeeId: string, solutionId: string): SessionGraph {
  if (!attendeeId.trim() || !solutionId.trim()) return graph;
  return {
    ...graph,
    votes: {
      ...graph.votes,
      [attendeeId]: solutionId,
    },
  };
}

export function voteTallies(graph: SessionGraph): Record<string, number> {
  const tallies: Record<string, number> = {};
  for (const solutionId of Object.values(graph.votes)) {
    tallies[solutionId] = (tallies[solutionId] ?? 0) + 1;
  }
  return tallies;
}

export type PublicProfile = {
  companyName: "Reply";
  industry: "Technology";
  sentence: "A services company. This sentence is public. It is not the business case.";
};

const replyPublicProfile: PublicProfile = {
  companyName: "Reply",
  industry: "Technology",
  sentence: "A services company. This sentence is public. It is not the business case.",
};

export type AccountLookupResult =
  | { hit: true; accountName: "Heartland Mutual Insurance" }
  | { hit: false; query: string; customerDoor: boolean; publicProfile: PublicProfile | null };

function publicProfileFor(normalized: string): PublicProfile | null {
  return normalized === "reply" ? replyPublicProfile : null;
}

export function lookupAccount(query: string, actor: Actor): AccountLookupResult {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();
  if (isCustomerViewer(actor)) {
    return { hit: false, query: trimmed, customerDoor: true, publicProfile: publicProfileFor(normalized) };
  }
  if (normalized === "heartland" || normalized === "heartland mutual insurance") {
    return { hit: true, accountName: "Heartland Mutual Insurance" };
  }
  return { hit: false, query: trimmed, customerDoor: false, publicProfile: publicProfileFor(normalized) };
}

export const heartlandKnownPeople: Record<string, { role: string }> = {
  "dana reyes": { role: "VP Claims Operations" },
  "michelle dorsey": { role: "Claims Supervisor" },
  "alex chen": { role: "Senior Developer" },
  "robert osei": { role: "Compliance Officer" },
  "sandeep nair": { role: "Director of Infrastructure" },
};

export type AttendeeEnrichment =
  | { kind: "known"; name: string; role: string; prompt: string }
  | { kind: "unknown"; name: string; prompt: string };

export function enrichAttendeeName(name: string, accountHit: boolean): AttendeeEnrichment {
  const trimmed = name.trim();
  const known = accountHit ? heartlandKnownPeople[trimmed.toLowerCase()] : undefined;
  if (known) {
    return {
      kind: "known",
      name: trimmed,
      role: known.role,
      prompt: "Is that the role in this session?",
    };
  }
  return {
    kind: "unknown",
    name: trimmed,
    prompt: `Couldn't find information on ${trimmed}. Tell me more about them.`,
  };
}

export function reorderSolutions(graph: SessionGraph, order: string[]): SessionGraph {
  if (graph.ranking.locked || graph.hackathon?.booked) return graph;
  const validIds = new Set(graph.solutions.map((solution) => solution.id));
  if (order.length !== graph.solutions.length || order.some((id) => !validIds.has(id))) return graph;
  return releaseStaleSampleRun({ ...graph, ranking: { ...graph.ranking, order: [...order] } });
}

export function moveSolution(graph: SessionGraph, solutionId: string, direction: "up" | "down"): SessionGraph {
  if (graph.ranking.locked || graph.hackathon?.booked) return graph;
  const index = graph.ranking.order.indexOf(solutionId);
  if (index < 0) return graph;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= graph.ranking.order.length) return graph;
  const order = [...graph.ranking.order];
  [order[index], order[swapWith]] = [order[swapWith], order[index]];
  return reorderSolutions(graph, order);
}

export function lockRanking(graph: SessionGraph): SessionGraph {
  if (graph.ranking.selected.length !== 3) return graph;
  if (graph.ranking.order.length === 0) return graph;
  return {
    ...graph,
    ranking: { ...graph.ranking, locked: true },
    outcome: {
      ...graph.outcome,
      nextStep: graph.outcome.nextStep.trim() || "3-day hackathon to scope a six-week pilot",
    },
  };
}

export function unlockRanking(graph: SessionGraph): SessionGraph {
  if (graph.hackathon?.booked) return graph;
  return releaseStaleSampleRun({
    ...graph,
    ranking: { ...graph.ranking, locked: false },
    hackathon: null,
  });
}

/** First solution in ranking order for this format. The rank screen numbers rows the same way. */
export function rankOneSolutionId(graph: SessionGraph): string | null {
  const allowed = new Set(solutionIdsForMechanic(graph.session.mechanic));
  return graph.ranking.order.find((id) => allowed.has(id)) ?? null;
}

/**
 * The seeded claims-intake extraction solution, looked up by its existing id.
 * Null when that id is missing or no longer a single solution.
 */
export function documentExtractionSolution(graph: SessionGraph): SolutionCandidate | null {
  const matches = withSolutionProducts(graph.solutions).filter((solution) => solution.id === "sol-intake-extraction");
  return matches.length === 1 ? matches[0] : null;
}

export function sampleRunSolutionReady(graph: SessionGraph) {
  const solution = documentExtractionSolution(graph);
  return Boolean(solution && rankOneSolutionId(graph) === solution.id);
}

/**
 * Solution the sample-run entry points follow.
 * Picked pilot when one is set, else the booked rank-1, else rank-1.
 */
export function sampleRunEntrySolutionId(graph: SessionGraph): string | null {
  const booked = graph.hackathon?.booked ? graph.hackathon.solutionIds : [];
  const pick = graph.outcome.pilotPick;
  if (pick && booked.includes(pick)) return pick;
  if (booked.length) {
    return graph.ranking.order.find((id) => booked.includes(id)) ?? booked[0];
  }
  return rankOneSolutionId(graph);
}

/** True when that solution is the extraction sample set, and the shortlist is locked or already booked. */
export function sampleRunEntryReady(graph: SessionGraph) {
  const id = sampleRunEntrySolutionId(graph);
  const extraction = documentExtractionSolution(graph);
  if (!id || !extraction || id !== extraction.id) return false;
  return Boolean(graph.hackathon?.booked || graph.ranking.locked);
}

/** Customer, and the partner on a facilitated session that is not the customer door. */
export function showsSampleRunLink(actor: Actor, graph: SessionGraph) {
  if (!sampleRunEntryReady(graph)) return false;
  if (isCustomerViewer(actor)) return true;
  return actor === "partner" && graph.session.delivery === "facilitated" && graph.session.customerDoor !== true;
}

export function sampleRunStatusLabel(graph: SessionGraph): string {
  const run = graph.sampleRun;
  if (!run || run.status === "not-run") return "Not run yet";
  const { reviewed, fix } = sampleRunTallies(run.marks);
  if (run.status === "reviewed") return `Reviewed 8 of 8 · ${fix} need a fix`;
  return `Reviewed ${reviewed} of 8`;
}

export function showsTryItCard(graph: SessionGraph) {
  return graph.ranking.locked && sampleRunSolutionReady(graph);
}

export function sampleRunHasStarted(graph: SessionGraph) {
  const status = graph.sampleRun?.status;
  return status === "ran" || status === "reviewed";
}

export function liveSampleRunFlag(graph: SessionGraph) {
  const run = graph.sampleRun;
  if (!run || !sampleRunHasStarted(graph)) return false;
  return run.solutionId === rankOneSolutionId(graph);
}

export function customerSampleRunLabel(graph: SessionGraph): string | null {
  if (!sampleRunEntryReady(graph)) return null;
  return sampleRunStatusLabel(graph);
}

export function releaseStaleSampleRun(graph: SessionGraph): SessionGraph {
  if (!graph.sampleRun) return graph;
  if (graph.sampleRun.solutionId === rankOneSolutionId(graph)) return graph;
  return { ...graph, sampleRun: null };
}

export function startSampleRun(graph: SessionGraph, actor: Actor, reviewerName: string, at: string): SessionGraph {
  if (!canMutateSampleRun(actor, graph)) return graph;
  const solution = documentExtractionSolution(graph);
  if (!solution || rankOneSolutionId(graph) !== solution.id) return graph;
  return {
    ...graph,
    sampleRun: {
      solutionId: solution.id,
      status: "ran",
      marks: {},
      position: 0,
      reviewedBy: reviewerName,
      at,
    },
  };
}

export function markSampleClaim(
  graph: SessionGraph,
  actor: Actor,
  claimId: string,
  verdict: "right" | "fix",
  fields: string[],
  reviewerName: string,
  at: string,
  advance = true,
): SessionGraph {
  if (!canMutateSampleRun(actor, graph) || !graph.sampleRun) return graph;
  if (!sampleRunHasStarted(graph)) return graph;
  if (graph.sampleRun.solutionId !== rankOneSolutionId(graph)) return graph;
  if (!isSampleClaimId(claimId)) return graph;
  const cleanFields = verdict === "right"
    ? []
    : [...new Set(fields.filter((field) => sampleFieldIds.has(field)))];
  const marks = { ...graph.sampleRun.marks, [claimId]: { verdict, fields: cleanFields } };
  const fromIndex = sampleClaims.findIndex((claim) => claim.id === claimId);
  const position = advance
    ? nextUnmarkedIndex(marks, fromIndex < 0 ? graph.sampleRun.position : fromIndex)
    : graph.sampleRun.position;
  return {
    ...graph,
    sampleRun: {
      ...graph.sampleRun,
      status: sampleRunTallies(marks).reviewed >= sampleClaims.length ? "reviewed" : "ran",
      marks,
      position,
      reviewedBy: reviewerName,
      at,
    },
  };
}

export function setSamplePosition(graph: SessionGraph, actor: Actor, position: number): SessionGraph {
  if (!canSetSamplePosition(actor, graph) || !graph.sampleRun) return graph;
  if (!Number.isInteger(position) || position < 0 || position >= sampleClaims.length) return graph;
  return { ...graph, sampleRun: { ...graph.sampleRun, position } };
}

export function startOverSampleRun(graph: SessionGraph, actor: Actor): SessionGraph {
  if (!canMutateSampleRun(actor, graph) || !graph.sampleRun) return graph;
  return { ...graph, sampleRun: null };
}

export function defaultHackathonDraft(graph: SessionGraph): HackathonBooking {
  const customerOwner =
    graph.outcome.owner
    ?? customerSponsor(graph)?.name
    ?? "Dana Reyes";
  const partnerSpecialist =
    graph.session.delivery === "google-facilitated"
      ? "Ravi Menon"
      : graph.session.facilitator?.name ?? "Ravi Menon";
  const googleFacilitator =
    graph.session.delivery === "google-facilitated"
      ? graph.session.facilitator?.name ?? "Priya Raghavan"
      : "Priya Raghavan";
  const selected = selectedSolutions(graph);
  const titles = selected.map((solution) => solution.title.toLowerCase());
  return {
    date: "",
    googleFacilitator,
    partnerSpecialist,
    customerOwner,
    question: titles.length === 3
      ? `Can we prove ${titles.join("; ")} on Heartland's own forms in three days?`
      : "Can we prove the three selected solutions on Heartland's own forms in three days?",
    showcaseAt: "",
    booked: false,
    solutionIds: [],
    calendarAdded: false,
    meetAdded: false,
  };
}

/** Booking form input. `showcaseAt` falls back to the afternoon of the third day. */
export type HackathonDraft = Omit<HackathonBooking, "booked" | "solutionIds" | "calendarAdded" | "meetAdded">;

export function bookHackathon(graph: SessionGraph, draft: HackathonDraft): SessionGraph {
  if (graph.ranking.selected.length !== 3) return graph;
  const date = draft.date.trim();
  const googleFacilitator = draft.googleFacilitator.trim();
  const partnerSpecialist = draft.partnerSpecialist.trim();
  const customerOwner = draft.customerOwner.trim();
  const question = draft.question.trim();
  if (!date || !googleFacilitator || !partnerSpecialist || !customerOwner || !question) return graph;
  const solutionIds = graph.ranking.order.filter((id) => graph.ranking.selected.includes(id));
  if (solutionIds.length !== 3) return graph;
  const showcaseAt = draft.showcaseAt?.trim() || defaultShowcaseAt(date);
  return {
    ...graph,
    ranking: { ...graph.ranking, locked: true },
    hackathon: {
      date,
      googleFacilitator,
      partnerSpecialist,
      customerOwner,
      question,
      showcaseAt,
      booked: true,
      solutionIds,
      calendarAdded: false,
      meetAdded: false,
    },
    outcome: {
      ...graph.outcome,
      nextStep: `3-day hackathon on ${date} to scope a six-week pilot`,
      owner: customerOwner,
      pilotPick: null,
    },
    session: {
      ...graph.session,
      status: "complete",
    },
  };
}

/** Demo: treat Google Calendar compose as done after the user opens it. */
export function markHackathonCalendarAdded(graph: SessionGraph): SessionGraph {
  if (!graph.hackathon?.booked) return graph;
  if (graph.hackathon.calendarAdded) return graph;
  return {
    ...graph,
    hackathon: { ...graph.hackathon, calendarAdded: true },
  };
}

/** Demo: treat the Google Meet room as booked after the user opens it. */
export function markHackathonMeetAdded(graph: SessionGraph): SessionGraph {
  if (!graph.hackathon?.booked) return graph;
  if (graph.hackathon.meetAdded) return graph;
  return {
    ...graph,
    hackathon: { ...graph.hackathon, meetAdded: true },
  };
}

export function applyPatternChoice(graph: SessionGraph, patternId: string): SessionGraph {
  return { ...graph, session: { ...graph.session, patternId } };
}

export function applyReusePriorPilotSpec(graph: SessionGraph, reuse: boolean): SessionGraph {
  return { ...graph, session: { ...graph.session, reusePriorPilotSpec: reuse } };
}
