"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, FileCheck2, LockKeyhole } from "lucide-react";

import { CustomerAccountPending } from "@/components/customer-account-pending";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { withBrandPeople } from "@/lib/brands";
import { ledgerAnnualTotal } from "@/lib/cost-model";
import {
  approvedTotal,
  awaitingReviewCount,
  formatFundingAmount,
  fundingListPageSize,
  fundingRequestsForPdm,
  fundingStatusLabel,
  type FundingClaimRow,
  type FundingStatus,
} from "@/lib/funding-book";
import { formatPortfolioMoney } from "@/lib/pdm-portfolio";
import { isCustomerViewer,
  claimsArtifactCopy,
  claimsVolumeProvenanceCopy,
  customerHasAccount,
  hasCompleteCostComponents,
  hasCompleteValueInputs,
} from "@/lib/session";
import { formatCurrency } from "@/lib/value";

function useFundingData() {
  const { graph, brand, viewer, submitFundingClaim, withdrawFundingClaim } = useSession();
  const people = withBrandPeople(brand);
  const claims = claimsArtifactCopy(graph);
  const ghost = graph.session.mechanic === "ghost-ledger";
  const hasValue = ghost ? hasCompleteCostComponents(graph) : hasCompleteValueInputs(graph);
  const annualValue = ghost
    ? graph.session.ledgerFrozen
      ? graph.outcome.annualValue
      : ledgerAnnualTotal(graph.costComponents)
    : graph.outcome.annualValue;
  const value = !hasValue
    ? "Pending session inputs"
    : graph.session.claimsVolumeChoice === "unconfirmed" && !ghost
    ? "Pending volume confirmation"
    : graph.session.claimsVolumeChoice === "range-250-500" && !ghost
      ? "$4.8M–$9.7M / year"
      : `${formatCurrency(annualValue)} / year`;

  return { graph, brand, viewer, people, claims, ghost, value, submitFundingClaim, withdrawFundingClaim };
}

type FundingData = ReturnType<typeof useFundingData>;

export default function FundingPage() {
  const data = useFundingData();
  if (isCustomerViewer(data.viewer.actor) && !customerHasAccount(data.viewer.actor, data.graph)) {
    return <CustomerAccountPending message="This is written once your account is in the session." />;
  }
  if (data.viewer.actor === "partner") return <PartnerFundingRequest data={data} />;
  if (data.viewer.actor === "pdm") return <PdmFundingRequests data={data} />;
  return <VendorFundingReview data={data} />;
}

function PartnerFundingRequest({ data }: { data: FundingData }) {
  const { graph, brand, people, claims, ghost, value, submitFundingClaim, withdrawFundingClaim } = data;
  const submitted = graph.session.fundingClaim;
  const booked = Boolean(graph.hackathon?.booked);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-black/48">{brand.partnerName} funding request</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Prepare the DAF claim</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/58">Review the evidence carried from the business case before submitting it through the partner portal.</p>
        </div>
        <span className="rounded-sm border border-black/15 bg-white px-3 py-2 text-xs font-medium">
          {submitted ? "Submitted · demo only" : "Draft · not submitted"}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-sm border border-black/10 bg-white">
          <div className="flex items-center gap-3 border-b border-black/10 bg-[#fafaf8] p-5">
            <FileCheck2 className="size-5" style={{ color: brand.accent }} />
            <div>
              <h2 className="font-semibold">Evidence from the value session</h2>
              <p className="mt-1 text-xs text-black/45">{graph.session.id}</p>
            </div>
          </div>
          <dl className="grid gap-px bg-black/10 sm:grid-cols-2">
            {[
              ["Customer", graph.session.customerName],
              ["Use case", graph.outcome.useCase || "Not captured"],
              ["Value", value],
              ["Format", ghost ? "Ghost ledger" : "Value sprint"],
            ].map(([term, detail]) => (
              <div key={term} className="bg-white p-5">
                <dt className="text-xs text-black/45">{term}</dt>
                <dd className="mt-1 text-sm font-medium">{detail}</dd>
              </div>
            ))}
          </dl>
          <div className="p-5">
            <h2 className="font-semibold">Attributed evidence</h2>
            {graph.captures.length ? (
              <ul className="mt-3 space-y-3">
                {graph.captures.slice(0, 5).map((capture) => (
                  <li key={capture.id} className="rounded-sm bg-[#fafaf8] p-4 text-sm leading-6">
                    <strong>{capture.attributedTo}</strong> — {capture.text}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-black/55">No attributed evidence has been captured yet.</p>}
            {claims.status && <p className="mt-4 text-sm text-amber-800">{claims.status}</p>}
            {graph.session.claimsVolumeChoice === "exact" && (
              <p className="mt-4 text-sm text-black/55">{claimsVolumeProvenanceCopy(graph)}</p>
            )}
          </div>
        </section>

        <aside className="h-fit rounded-sm border border-black/10 bg-white p-5 shadow-sm">
          <LockKeyhole className="size-5" style={{ color: brand.accent }} />
          <h2 className="mt-4 text-lg font-semibold">Partner submission</h2>
          <p className="mt-2 text-sm leading-6 text-black/58">Practice sponsor: {people.sponsorLine}</p>
          {submitted ? (
            <>
              <p className="mt-5 rounded-sm bg-[color-mix(in_srgb,var(--brand-accent)_8%,white)] p-3 text-sm leading-6">
                Recorded in this demo only. Nothing was sent.
              </p>
              <button type="button" disabled className={buttonVariants({ className: "mt-5 w-full cursor-not-allowed opacity-55" })}>Submitted</button>
              <button type="button" onClick={withdrawFundingClaim} className="mt-3 text-sm underline-offset-2 hover:underline">Withdraw</button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={!booked}
                onClick={() => submitFundingClaim()}
                className={buttonVariants({ className: "mt-5 w-full bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)] disabled:cursor-not-allowed disabled:opacity-55" })}
              >
                Submit funding claim
              </button>
              {!booked && <p className="mt-2 text-xs leading-5 text-black/48">Book the hackathon first.</p>}
            </>
          )}
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/artifact" className={buttonVariants({ variant: "outline" })}><ArrowLeft /> Back to business case</Link>
        <Link href="/pilot-spec" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>Open pilot spec <ArrowRight /></Link>
      </div>
    </div>
  );
}

const statusTone: Record<FundingStatus, string> = {
  "awaiting-review": "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  returned: "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]",
};

function PdmFundingRequests({ data }: { data: FundingData }) {
  const { graph, brand } = data;
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [packOpen, setPackOpen] = useState(false);
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const requests = fundingRequestsForPdm(graph, brand.partnerName);
  const approved = approvedTotal(requests);
  const awaiting = awaitingReviewCount(requests);
  const filtered = requests.filter((row) => (
    (partnerFilter === "all" || row.partner === partnerFilter) && (statusFilter === "all" || row.status === statusFilter)
  ));
  const visible = showAll ? filtered : filtered.slice(0, fundingListPageSize);

  if (packOpen) return <VendorFundingReview data={data} onBack={() => setPackOpen(false)} />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <p className="md-label-large text-[var(--md-sys-color-primary)]">Funding</p>
      <h1 className="md-headline-medium mt-1">Funding requests</h1>
      <p className="md-body-large mt-3 max-w-3xl text-[var(--md-sys-color-on-surface-variant)]">Claims submitted by the partners you cover.</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Requests", String(requests.length)],
          ["Awaiting review", String(awaiting)],
          ["Approved", String(approved.count)],
          ["Fund approved", `${formatPortfolioMoney(approved.amount)} across ${approved.count} claims`],
        ].map(([term, detail]) => (
          <div key={term} className="md-card-outlined p-4">
            <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{term}</dt>
            <dd className="md-title-medium mt-1">{detail}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <label className="md-label-medium flex items-center gap-2">
          Partner
          <select aria-label="Partner" value={partnerFilter} onChange={(event) => { setPartnerFilter(event.target.value); setShowAll(false); }} className="md-body-medium rounded-[var(--md-sys-shape-small)] border border-[var(--md-sys-color-outline)] bg-transparent px-2 py-1">
            <option value="all">All partners</option>
            {["CDW", "SoftwareOne", "Insight", "SHI"].map((partner) => <option key={partner} value={partner}>{partner}</option>)}
          </select>
        </label>
        <label className="md-label-medium flex items-center gap-2">
          Status
          <select aria-label="Status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setShowAll(false); }} className="md-body-medium rounded-[var(--md-sys-shape-small)] border border-[var(--md-sys-color-outline)] bg-transparent px-2 py-1">
            <option value="all">All statuses</option>
            <option value="awaiting-review">Awaiting review</option>
            <option value="approved">Approved</option>
            <option value="returned">Returned</option>
          </select>
        </label>
      </div>

      <section className="md-card-outlined mt-7 overflow-hidden" aria-label="Funding requests">
        <div className="overflow-x-auto">
          <table className="md-body-medium w-full min-w-[880px] text-left">
            <thead className="md-label-medium bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)]">
              <tr>
                <th className="px-5 py-3 font-medium">Partner</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Use case</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Quarter</th>
                <th className="px-5 py-3 font-medium"><span className="sr-only">Evidence</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--md-sys-color-outline-variant)]">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-[var(--md-sys-color-on-surface-variant)]">No requests match.</td></tr>
              )}
              {visible.map((row) => {
                const expanded = open === row.id;
                return (
                  <FundingRow
                    key={row.id}
                    row={row}
                    expanded={expanded}
                    onToggle={() => setOpen(expanded ? null : row.id)}
                    onOpenPack={row.live ? () => setPackOpen(true) : undefined}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--md-sys-color-outline-variant)] px-5 py-3">
          <p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Showing {visible.length} of {filtered.length}</p>
          {filtered.length > fundingListPageSize && (
            <button type="button" onClick={() => setShowAll((value) => !value)} className="md-button-text">
              {showAll ? "Show fewer" : `Show all ${filtered.length}`}
            </button>
          )}
        </div>
      </section>
      <p className="md-label-medium mt-4 text-[var(--md-sys-color-on-surface-variant)]">Customer names appear because the partner submitted these claims. Drafts stay with the partner until they submit.</p>
    </div>
  );
}

function FundingRow({ row, expanded, onToggle, onOpenPack }: { row: FundingClaimRow; expanded: boolean; onToggle: () => void; onOpenPack?: () => void }) {
  return (
    <>
      <tr className={row.live ? "bg-[var(--md-sys-color-primary-container)]" : "hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_5%,transparent)]"}>
        <td className="px-5 py-4">{row.partner}</td>
        <td className="px-5 py-4 font-medium">{row.customer}</td>
        <td className="px-5 py-4">{row.useCase}</td>
        <td className="px-5 py-4 tabular-nums">{formatFundingAmount(row.amount)}</td>
        <td className="px-5 py-4">
          <span className={`md-label-medium inline-flex items-center rounded-[var(--md-sys-shape-full)] px-2 py-1 ${statusTone[row.status]}`}>{fundingStatusLabel(row.status)}</span>
        </td>
        <td className="px-5 py-4 text-[var(--md-sys-color-on-surface-variant)]">{row.quarter}</td>
        <td className="px-5 py-4 text-right">
          <button type="button" onClick={onToggle} aria-expanded={expanded} className="md-button-text inline-flex items-center gap-1">
            Evidence <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[var(--md-sys-color-surface-container)]">
          <td colSpan={7} className="px-5 py-4">
            <p className="md-body-medium">{row.evidence.valueBasis} · {row.evidence.quotes} {row.evidence.quotes === 1 ? "quote" : "quotes"}</p>
            <ul className="md-body-medium mt-2 space-y-1">
              {row.evidence.checklist.map((item) => (
                <li key={item.label}>{item.done ? "Done" : "Open"} · {item.label}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" disabled className="md-button-filled cursor-not-allowed opacity-55">Approve</button>
              <button type="button" disabled className="md-button-outlined cursor-not-allowed opacity-55">Return</button>
              <p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Approval happens in the vendor&apos;s funding system.</p>
            </div>
            {onOpenPack && (
              <button type="button" onClick={onOpenPack} className="md-button-filled mt-3">
                Open the pack <ArrowRight className="size-4" />
              </button>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function VendorFundingReview({ data, onBack }: { data: FundingData; onBack?: () => void }) {
  const { graph, brand, viewer, people, claims, ghost, value } = data;
  const submitted = graph.session.fundingClaim;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <p className="md-label-large text-[var(--md-sys-color-primary)]">Funding</p>
      <h1 className="md-headline-medium mt-1">DAF substantiation pack</h1>
      <p className="md-body-large mt-3 max-w-3xl text-[var(--md-sys-color-on-surface-variant)]">The partner submits the claim. The platform vendor reviews evidence shared by the partner; it does not rewrite the business case.</p>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="md-card-outlined overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] p-5">
            <span className="grid size-11 place-items-center rounded-[var(--md-sys-shape-large)] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"><FileCheck2 /></span>
            <div>
              <p className="md-title-medium">Session evidence</p>
              <p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{graph.session.id}</p>
            </div>
            <span className="md-chip ml-auto">{submitted ? "Submitted · demo only" : "Draft · not submitted"}</span>
          </div>

          <dl className="grid gap-px bg-[var(--md-sys-color-outline-variant)] sm:grid-cols-2">
            {[
              ["Customer", graph.session.customerName],
              ["Partner", brand.partnerName],
              ["Use case", graph.outcome.useCase || "Not captured"],
              ["Value", value],
              ["Format", ghost ? "Ghost ledger" : "Value sprint"],
              ["Who ran it", graph.session.delivery === "self-service" ? "Customer-run · uncommon · unverified estimate" : graph.session.delivery === "google-facilitated" ? "Google-facilitated" : "Partner-facilitated"],
            ].map(([term, detail]) => (
              <div key={term} className="bg-[var(--md-sys-color-surface)] p-5">
                <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{term}</dt>
                <dd className="md-body-large mt-1">{detail}</dd>
              </div>
            ))}
          </dl>

          <div className="p-5">
            <h2 className="md-title-medium">Attributed evidence</h2>
            {graph.captures.length ? (
              <ul className="mt-4 space-y-3">
                {graph.captures.slice(0, 5).map((capture) => (
                  <li key={capture.id} className="md-body-medium rounded-[var(--md-sys-shape-small)] bg-[var(--md-sys-color-surface-container)] p-4">
                    <strong>{capture.attributedTo}</strong> — {capture.text}
                  </li>
                ))}
              </ul>
            ) : <p className="md-body-medium mt-4 text-[var(--md-sys-color-on-surface-variant)]">No attributed evidence has been captured yet.</p>}
            {claims.status && <p className="md-body-medium mt-4 text-[var(--md-sys-color-on-surface-variant)]">{claims.status}</p>}
            {graph.session.claimsVolumeChoice === "exact" && (
              <p className="md-body-medium mt-4 text-[var(--md-sys-color-on-surface-variant)]">
                {claimsVolumeProvenanceCopy(graph)}
              </p>
            )}
          </div>
        </section>

        <aside className="md-card-elevated h-fit p-5">
          <LockKeyhole className="size-6 text-[var(--md-sys-color-primary)]" />
          <h2 className="md-title-large mt-4">{viewer.actor === "partner" ? "Partner submission" : "Vendor review"}</h2>
          <p className="md-body-medium mt-3 text-[var(--md-sys-color-on-surface-variant)]">Practice sponsor: {people.sponsorLine}</p>
          <button type="button" disabled className="md-button-filled mt-5 w-full cursor-not-allowed opacity-55">
            {viewer.actor === "partner" ? "Submit funding claim" : "Approve funding claim"}
          </button>
          <p className="md-label-medium mt-3 text-[var(--md-sys-color-on-surface-variant)]">Approval happens in the vendor&apos;s funding system.</p>
        </aside>
      </div>

      {onBack ? (
        <button type="button" onClick={onBack} className="md-button-outlined mt-6"><ArrowLeft className="size-4" /> Back to funding requests</button>
      ) : (
        <Link href="/artifact" className="md-button-outlined mt-6"><ArrowLeft className="size-4" /> Back to business case</Link>
      )}
    </div>
  );
}
