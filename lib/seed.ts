export type Actor = "pdm" | "partner" | "customer";
export type Delivery = "facilitated" | "google-facilitated" | "self-service";
export type Mechanic = "value-sprint" | "ghost-ledger";
export type CloseStyle = "owner-and-ask" | "board-slide";
export type FieldSource = "partner-portal" | "crm" | "typed" | "inferred";
export type ScopeMode = "seeded" | "cold";
export type SessionFocus = "session" | "hackathon";
export type HackathonDecision = "go" | "not-going-ahead";
export type PilotSignoff = { at: string; recordedBy: string };
export type HandoffKind = "daf" | "pilot" | "pdm-notified";

/** The partner's illustrative DAF submission. Null until recorded; recorded once. */
export type FundingClaim = { at: string; recordedBy: string; amount: number };

/** What the partner did with the session after the room: recorded once, never replaced. */
export type Handoff = {
  kind: HandoffKind;
  at: string;
  sponsor: string;
};

export type SolutionCandidate = {
  id: string;
  title: string;
  outcome: string;
  valueAnchor: string;
  /** Gemini / Google Cloud products the solution uses in the demo. */
  products: string[];
  /** Agenda step where the room named this solution; its latest capture is the pain line. */
  stepId?: string;
};

export type RankingState = {
  order: string[];
  selected: string[];
  locked: boolean;
};

export type SampleRunMark = {
  verdict: "right" | "fix";
  fields: string[];
};

/** One simulated pass over the sample claims. Null until someone starts it. */
export type SampleRun = {
  solutionId: string;
  status: "not-run" | "ran" | "reviewed";
  marks: Record<string, SampleRunMark>;
  position: number;
  reviewedBy: string | null;
  at: string | null;
};

export type HackathonBooking = {
  date: string;
  googleFacilitator: string;
  partnerSpecialist: string;
  customerOwner: string;
  question: string;
  /** Solution showcase, `YYYY-MM-DDTHH:MM`. Booking and hydrate default it to 14:00 on the third day. */
  showcaseAt?: string;
  booked: boolean;
  /** Solution ids booked into the hackathon (exactly three when booked). */
  solutionIds: string[];
  /** Demo assumes Calendar compose was completed after the user opens it. */
  calendarAdded?: boolean;
  /** Demo assumes a Google Meet room was opened after the user starts it. */
  meetAdded?: boolean;
};

export type ColdCompany = {
  name: string;
  industry: string;
  sizeBand: string;
};

export type ColdAttendee = {
  id?: string;
  name: string;
  role: string;
};

export type Session = {
  id: string;
  customerName: string;
  customerContext: string;
  industry: string;
  partnerId: string;
  facilitator: { name: string; title: string } | null;
  practiceSponsor: { name: string; title: string };
  patternId: string;
  delivery: Delivery;
  mechanic: Mechanic;
  closeStyle: CloseStyle;
  scheduledFor: string;
  status: "scoped" | "planned" | "running" | "complete";
  qualified: boolean;
  ledgerFrozen: boolean;
  fundingRoute: "invite-karen" | "brief-dana" | null;
  reusePriorPilotSpec: boolean | null;
  claimsVolumeChoice: "about-400" | "range-250-500" | "unconfirmed" | "exact" | null;
  scopeMode: ScopeMode;
  /** Customer door: true once a format card has started the customer session. */
  customerFormatChosen?: boolean;
  /** Self-service arrival from the Customer card. Starts false. Viewing as does not set it. */
  customerDoor: boolean;
  /** Partner's handoff after the session. Null until recorded. */
  handoff: Handoff | null;
  /** Which stepper and landing the profile uses. Does not change the booking. */
  focus: SessionFocus;
  /** Recorded after Go. Null until someone marks the pilot signed. */
  pilotSigned: PilotSignoff | null;
  /** Partner's funding submission. Null until the partner records it on Funding. */
  fundingClaim: FundingClaim | null;
};

export type AgendaStep = {
  id: string;
  sessionId: string;
  order: number;
  title: string;
  prompt: string;
  subPrompt?: string;
  durationMinutes: number;
  state: "done" | "active" | "upcoming";
};

export type Capture = {
  id: string;
  sessionId: string;
  stepId: string;
  attributedTo: string;
  text: string;
  capturedAt: string;
};

export type PartnerNote = {
  id: string;
  author: string;
  text: string;
  updatedAt: string;
};

export type ValueInput = {
  id: string;
  sessionId: string;
  label: string;
  quantity: number | null;
  unit: string;
  confirmedBy: string | null;
  respondentConfirmed: boolean;
};

export type Outcome = {
  id: string;
  sessionId: string;
  useCase: string;
  annualValue: number;
  owner: string | null;
  nextStep: string;
  constraint: string;
  partiallyEstimated?: boolean;
  /** Solution id named by Go. Empty until then, including when the decision is not going ahead. */
  pilotPick: string | null;
  hackathonDecision: HackathonDecision | null;
};

export type Attendee = {
  id: string;
  name: string;
  role: string;
  reason: string;
  source: FieldSource;
  attendance: "attending" | "invited-not-attending";
};

export type CostComponent = {
  id: string;
  label: string;
  inputs: { label: string; quantity: number | null; unit: string }[];
  confirmedBy: string | null;
};

export type SessionGraph = {
  session: Session;
  agenda: AgendaStep[];
  captures: Capture[];
  partnerNotes: PartnerNote[];
  valueInputs: ValueInput[];
  costComponents: CostComponent[];
  outcome: Outcome;
  attendees: Attendee[];
  coldCompany: ColdCompany | null;
  coldAttendees: ColdAttendee[];
  solutions: SolutionCandidate[];
  ranking: RankingState;
  hackathon: HackathonBooking | null;
  /** CPM votes: one solution id per attendee id. */
  votes: Record<string, string>;
  /** Sample claims preview. Null in the seed, and when the rank-1 solution changes. */
  sampleRun: SampleRun | null;
};

export const patterns = [
  {
    id: "document-intake",
    name: "Document-heavy intake",
    valueDrivers: ["handling time", "avoidable delay", "daily volume"],
    questions: ["Which documents create the longest queues?", "Where must a human stay in the loop?"],
    requiredRoles: ["Operations owner", "Frontline supervisor", "Developer", "Compliance", "Infrastructure", "Economic buyer"],
    typicalValueRange: "$2M–$9M annual opportunity",
    knownGaps: [
      "Handwritten adjuster notes in the margin",
      "Multi-page claims with inconsistent field order",
      "Low-confidence routing not implemented",
    ],
  },
  {
    id: "contact-centre-summarisation",
    name: "Contact-centre summarisation",
    valueDrivers: ["after-call work", "call volume"],
    questions: ["How long does wrap-up take?", "What must summaries retain?"],
    requiredRoles: ["Contact centre lead", "Agent", "Compliance"],
    typicalValueRange: "$1M–$5M annual opportunity",
    knownGaps: ["Accent and overlapping speakers", "Policy citations that must stay verbatim"],
  },
  {
    id: "knowledge-retrieval",
    name: "Knowledge retrieval",
    valueDrivers: ["search time", "case volume"],
    questions: ["Where does trusted guidance live?", "How is freshness proven?"],
    requiredRoles: ["Knowledge owner", "Security", "Frontline user"],
    typicalValueRange: "$750K–$4M annual opportunity",
    knownGaps: ["Stale PDFs beside the live wiki", "Access-controlled folders the index cannot see"],
  },
  {
    id: "fraud-triage",
    name: "Fraud triage",
    valueDrivers: ["review volume", "false positives"],
    questions: ["What makes a case review-worthy?", "Which decisions require explanation?"],
    requiredRoles: ["Fraud lead", "Investigator", "Risk"],
    typicalValueRange: "$3M–$12M annual opportunity",
    knownGaps: ["Rare collusion patterns", "Explanation text that satisfies audit"],
  },
] as const;

const sessionId = "heartland-2026-09";

export const heartlandSolutions: SolutionCandidate[] = [
  {
    id: "sol-intake-extraction",
    title: "AI-assisted claims intake extraction",
    outcome: "Pre-fill claim fields from PDFs so supervisors stop retyping every form.",
    valueAnchor: "$7.75M annual handling-cost opportunity at 400 claims/day",
    products: ["Gemini", "Document AI"],
    stepId: "where-it-hurts",
  },
  {
    id: "sol-low-confidence-review",
    title: "Low-confidence human review routing",
    outcome: "Send only uncertain extractions to Michelle's team; keep the rest moving.",
    valueAnchor: "Protects the 15% Michelle flagged as the hard cases",
    products: ["Gemini", "Vertex AI"],
    stepId: "constraints",
  },
  {
    id: "sol-handwriting-assist",
    title: "Handwritten adjuster-note assist",
    outcome: "Surface margin notes that today's OCR drops so intake does not stall.",
    valueAnchor: "Closes the handwritten-notes gap named in the session",
    products: ["Gemini", "Document AI"],
    stepId: "constraints",
  },
  {
    id: "sol-audit-trail",
    title: "Assisted-decision audit trail",
    outcome: "Every automated assist leaves an evidence path compliance can review.",
    valueAnchor: "Unblocks Robert's audit-trail constraint on assisted extraction",
    products: ["Gemini", "Cloud Logging"],
    stepId: "constraints",
  },
  {
    id: "sol-overtime-reduction",
    title: "Intake overtime reduction",
    outcome: "Cut the overtime Heartland paid instead of hiring through Q1 volume.",
    valueAnchor: "$48k/month overtime named by Dana",
    products: ["Gemini", "Document AI"],
    stepId: "where-it-hurts",
  },
  {
    id: "sol-rework-leakage",
    title: "Rework and reopen leakage cut",
    outcome: "Fewer reopened claims from incomplete first-pass extraction.",
    valueAnchor: "6% reopen rate × $210 each in the cost model",
    products: ["Gemini", "Vertex AI"],
    stepId: "volume-and-cost",
  },
  {
    id: "sol-status-summary",
    title: "Claim-status summarisation for the floor",
    outcome: "Give supervisors a one-screen status pull instead of chasing PDFs.",
    valueAnchor: "340 review hours/week at $61 loaded rate",
    products: ["Gemini", "Vertex AI Search"],
    stepId: "volume-and-cost",
  },
];

/** Value-sprint shortlist — four prepared business-case solutions. */
export const businessCaseSolutionIds = [
  "sol-intake-extraction",
  "sol-low-confidence-review",
  "sol-handwriting-assist",
  "sol-audit-trail",
] as const;

/** Ghost-ledger shortlist — three cost-of-waiting solutions. */
export const ledgerSolutionIds = [
  "sol-overtime-reduction",
  "sol-rework-leakage",
  "sol-status-summary",
] as const;

export const businessCaseSolutions = heartlandSolutions.filter((solution) =>
  (businessCaseSolutionIds as readonly string[]).includes(solution.id),
);

export const ledgerSolutions = heartlandSolutions.filter((solution) =>
  (ledgerSolutionIds as readonly string[]).includes(solution.id),
);

export const initialSessionGraph: SessionGraph = {
  session: {
    id: sessionId,
    customerName: "Heartland Mutual Insurance",
    customerContext:
      "Heartland Mutual is a $900M insurer in Des Moines with 4,000 employees. Claims intake takes six days and relies on manual reading of PDF claim forms.",
    industry: "Insurance",
    partnerId: "cdw",
    facilitator: { name: "Ravi Menon", title: "Solution Specialist, AI & Data" },
    practiceSponsor: { name: "Tom Brennan", title: "AI & Data Practice Lead" },
    patternId: "document-intake",
    delivery: "facilitated",
    mechanic: "value-sprint",
    closeStyle: "owner-and-ask",
    scheduledFor: "2026-09-21T09:00:00-05:00",
    status: "running",
    qualified: false,
    ledgerFrozen: false,
    fundingRoute: null,
    reusePriorPilotSpec: true,
    claimsVolumeChoice: null,
    scopeMode: "seeded",
    customerDoor: false,
    handoff: null,
    focus: "session",
    pilotSigned: null,
    fundingClaim: null,
  },
  agenda: [
    ["where-it-hurts", "Where it hurts", "Walk me through what happens when a claim arrives.", 30, "done"],
    ["volume-and-cost", "Volume and cost", "How many claims a day, and what does one cost you to handle?", 40, "done"],
    ["constraints", "Constraints", "What would have to be true for compliance to sign off on automated extraction?", 30, "active"],
    ["shape-the-pilot", "Shape the pilot", "If we proved this on 500 real claims, what would convince you?", 45, "upcoming"],
    ["owner-and-ask", "Owner and ask", "Who owns this, and what are we asking Karen for?", 30, "upcoming"],
  ].map(([id, title, prompt, durationMinutes, state], index) => ({
    id: String(id),
    sessionId,
    order: index + 1,
    title: String(title),
    prompt: String(prompt),
    durationMinutes: Number(durationMinutes),
    state: state as AgendaStep["state"],
  })),
  captures: [
    ["cap-1", "where-it-hurts", "Michelle Dorsey", "Intake sits six days, mostly manual PDF reading."],
    ["cap-2", "constraints", "Michelle Dorsey", "The 15% the model would get wrong are the same ones my team finds hard."],
    ["cap-3", "constraints", "Robert Osei", "Audit trail required on any automated decision; assisted extraction is acceptable."],
    ["cap-4", "where-it-hurts", "Dana Reyes", "We handled Q1 volume by paying overtime, not by hiring."],
    ["cap-5", "constraints", "Alex Chen", "Our forms have handwritten adjuster notes in the margin."],
  ].map(([id, stepId, attributedTo, text], index) => ({
    id,
    sessionId,
    stepId,
    attributedTo,
    text,
    capturedAt: `2026-09-21T10:${20 + index}:00-05:00`,
  })),
  partnerNotes: [],
  valueInputs: [
    { id: "claims", sessionId, label: "Claims per day", quantity: 400, unit: "claims/day", confirmedBy: "Michelle Dorsey", respondentConfirmed: true },
    { id: "delay", sessionId, label: "Avoidable delay", quantity: 2, unit: "days", confirmedBy: "Dana Reyes", respondentConfirmed: true },
    { id: "handling", sessionId, label: "Handling cost", quantity: 38.75, unit: "$/claim", confirmedBy: "Michelle Dorsey", respondentConfirmed: true },
  ],
  costComponents: [
    {
      id: "handling",
      label: "Handling labour",
      confirmedBy: "Michelle Dorsey",
      inputs: [
        { label: "Claims per day", quantity: 400, unit: "claims/day" },
        { label: "Avoidable delay", quantity: 2, unit: "days" },
        { label: "Handling cost", quantity: 38.75, unit: "$/claim" },
      ],
    },
    {
      id: "review",
      label: "Manual review hours",
      confirmedBy: "Dana Reyes",
      inputs: [
        { label: "Hours per week", quantity: 340, unit: "h/week" },
        { label: "Loaded rate", quantity: 61, unit: "$/h" },
      ],
    },
    {
      id: "rework",
      label: "Rework and leakage",
      confirmedBy: "Dana Reyes",
      inputs: [
        { label: "Claims per day", quantity: 400, unit: "claims/day" },
        { label: "Reopen rate", quantity: 0.06, unit: "share" },
        { label: "Cost each", quantity: 210, unit: "$" },
      ],
    },
    {
      id: "overtime",
      label: "Overtime",
      confirmedBy: "Dana Reyes",
      inputs: [{ label: "Monthly overtime", quantity: 48_000, unit: "$/month" }],
    },
  ],
  outcome: {
    id: "outcome-1",
    sessionId,
    useCase: "AI-assisted claims intake extraction",
    annualValue: 7_750_000,
    owner: "Alex Chen",
    nextStep: "3-day hackathon to scope a six-week pilot",
    constraint: "Human review on low-confidence extractions",
    pilotPick: null,
    hackathonDecision: null,
  },
  solutions: heartlandSolutions,
  ranking: {
    order: heartlandSolutions.map((solution) => solution.id),
    selected: [],
    locked: false,
  },
  hackathon: null,
  votes: {
    dana: "sol-intake-extraction",
    michelle: "sol-intake-extraction",
    robert: "sol-low-confidence-review",
    alex: "sol-handwriting-assist",
    sandeep: "sol-audit-trail",
  },
  sampleRun: null,
  attendees: [
    { id: "dana", name: "Dana Reyes", role: "VP Claims Operations", reason: "Owns the operating outcome and can sponsor the pilot.", source: "crm", attendance: "attending" },
    { id: "michelle", name: "Michelle Dorsey", role: "Claims Supervisor", reason: "Brings the frontline workflow and handling-cost evidence.", source: "crm", attendance: "attending" },
    { id: "alex", name: "Alex Chen", role: "Senior Developer", reason: "Can confirm integration constraints and own the pilot.", source: "crm", attendance: "attending" },
    { id: "robert", name: "Robert Osei", role: "Compliance Officer", reason: "Warning: sessions that invite compliance late lose two weeks.", source: "crm", attendance: "attending" },
    { id: "sandeep", name: "Sandeep Nair", role: "Director of Infrastructure", reason: "Confirms data access, security, and deployment boundaries.", source: "crm", attendance: "attending" },
    { id: "karen", name: "Karen Whitfield", role: "CFO", reason: "Economic buyer · invited, not attending", source: "crm", attendance: "invited-not-attending" },
  ],
  coldCompany: null,
  coldAttendees: [],
};

export const attendees: Attendee[] = initialSessionGraph.attendees;

export const prework = [
  "Bring 10 representative PDF claim forms, including handwritten notes.",
  "Confirm a recent week’s intake volume and handling-cost estimate.",
  "Mark which claim fields require audit evidence or human review.",
];
