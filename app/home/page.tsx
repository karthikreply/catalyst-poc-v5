"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeDollarSign, ChartNoAxesCombined } from "lucide-react";

import { useSession } from "@/components/session-provider";
import { PortfolioCharts } from "@/components/portfolio-charts";
import { awaitingReviewCount, fundingRequestsForPdm } from "@/lib/funding-book";
import { fewestSignedLine, formatPortfolioMoney, fundRatio, portfolio, portfolioSummary } from "@/lib/pdm-portfolio";
import { customerSponsor, handoffLabel, isCustomerViewer } from "@/lib/session";

export default function Home() {
  const { graph, brand, viewer, setFocus, hydrated } = useSession();
  const router = useRouter();
  const customerViewer = isCustomerViewer(viewer.actor);

  useEffect(() => {
    if (hydrated && customerViewer) router.replace(graph.session.focus === "hackathon" ? "/hackathon" : "/customer");
  }, [hydrated, customerViewer, graph.session.focus, router]);

  if (!hydrated || customerViewer) return null;

  if (viewer.actor === "pdm") return <PdmHome />;

  const handoff = graph.session.handoff;
  const sponsor = handoff?.sponsor || graph.outcome.owner || customerSponsor(graph)?.name || "Not named";
  const handoffAt = handoff ? new Date(handoff.at).toLocaleString() : "—";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <p className="md-label-large text-[var(--md-sys-color-primary)]">Your session</p>
      <h1 className="md-display-small mt-2">Hello, {viewer.name.split(" ")[0]}</h1>
      <p className="md-body-large mt-3 max-w-2xl text-[var(--md-sys-color-on-surface-variant)]">
        {graph.session.customerName} with {brand.partnerName}.
      </p>
      <Link
        href="/scope"
        onClick={() => setFocus("session")}
        className="md-button-filled mt-6"
      >
        Open the session <ArrowRight className="size-4" />
      </Link>

      <section className="md-card-outlined mt-6 p-5" aria-labelledby="handoff-strip-title">
        <h2 id="handoff-strip-title" className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Handoff · {graph.session.customerName}</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Sponsor</dt>
            <dd className="md-title-medium mt-1">{sponsor}</dd>
          </div>
          <div>
            <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Handoff</dt>
            <dd className="md-title-medium mt-1">{handoffLabel(handoff)}</dd>
          </div>
          <div>
            <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Time</dt>
            <dd className="md-title-medium mt-1">{handoffAt}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <DashboardCard icon={BadgeDollarSign} title="Funding" body="Review the substantiation pack behind a hackathon booking." href="/funding" />
        <DashboardCard icon={ChartNoAxesCombined} title="Telemetry" body="Study conversion from session to hackathon booked." href="/telemetry" />
      </div>
    </div>
  );
}

function PdmHome() {
  const { graph, brand } = useSession();
  const requests = fundingRequestsForPdm(graph, brand.partnerName);
  const awaiting = awaitingReviewCount(requests);
  const awaitingAmount = requests.filter((row) => row.status === "awaiting-review").reduce((sum, row) => sum + row.amount, 0);
  const awaitingPartners = new Set(requests.filter((row) => row.status === "awaiting-review").map((row) => row.partner)).size;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="md-card-outlined flex flex-col p-6" aria-labelledby="portfolio-title">
          <h1 id="portfolio-title" className="md-headline-medium">Illustrative portfolio</h1>
          <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">{portfolioSummary()}</p>
          <p className="md-body-medium mt-1 text-[var(--md-sys-color-on-surface-variant)]">{fewestSignedLine()}</p>
          <p className="md-label-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">Partner names and figures are placeholders.</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Headline term="Sessions" detail={String(portfolio.headlines.sessions)} />
            <Headline term="Hackathons booked" detail={String(portfolio.headlines.booked)} />
            <Headline term="Pilots signed" detail={String(portfolio.headlines.signed)} />
            <Headline term="Fund approved" detail={`${formatPortfolioMoney(portfolio.headlines.fundApproved)} across ${portfolio.headlines.approvedClaims} claims`} />
            <Headline term="Signed pilot value" detail={formatPortfolioMoney(portfolio.headlines.signedPilotValue)} />
            <Headline term="Signed value to fund" detail={`About ${fundRatio()} to 1`} />
          </dl>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
            <Link href="/funding" className="md-button-filled">Funding requests</Link>
            <Link href="/telemetry" className="md-button-outlined">Telemetry</Link>
          </div>
        </section>

        <section className="md-card-outlined p-6" aria-labelledby="attention-title">
          <h2 id="attention-title" className="md-title-large">Needs your attention</h2>
          <ul className="mt-4 space-y-4">
            <li>
              <p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Funding</p>
              <Link href="/funding" className="md-title-medium mt-1 block text-[var(--md-sys-color-primary)] underline-offset-4 hover:underline">
                {awaiting} {awaiting === 1 ? "claim" : "claims"} awaiting review
              </Link>
              <p className="md-body-medium mt-1 text-[var(--md-sys-color-on-surface-variant)]">
                {formatPortfolioMoney(awaitingAmount)} requested across {awaitingPartners} partners.
              </p>
            </li>
            <li>
              <p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Quiet partner</p>
              <p className="md-title-medium mt-1">{fewestSignedLine()}</p>
            </li>
          </ul>
        </section>
      </div>
      <PortfolioCharts />
      <section className="md-card-outlined mt-6 p-6" aria-label="Portfolio by partner">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]">
              <th className="py-2 pr-3 font-medium">Partner</th>
              <th className="py-2 pr-3 font-medium">Sessions</th>
              <th className="py-2 pr-3 font-medium">Hackathons booked</th>
              <th className="py-2 pr-3 font-medium">Pilots signed</th>
              <th className="py-2 pr-3 font-medium">Fund approved</th>
              <th className="py-2 font-medium">Signed pilot value</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.partners.map((row) => (
              <tr key={row.partner} className="border-b border-[var(--md-sys-color-outline-variant)]">
                <td className="py-2 pr-3">{row.partner}</td>
                <td className="py-2 pr-3">{row.sessions}</td>
                <td className="py-2 pr-3">{row.booked}</td>
                <td className="py-2 pr-3">{row.signed}</td>
                <td className="py-2 pr-3">{formatPortfolioMoney(row.fundApproved)}</td>
                <td className="py-2">{formatPortfolioMoney(row.signedPilotValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Headline({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{term}</dt>
      <dd className="md-title-large mt-1">{detail}</dd>
    </div>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: typeof BadgeDollarSign;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link href={href} className="md-card-outlined block min-h-52 p-5 transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_5%,var(--md-sys-color-surface))]">
      <Icon className="size-6 text-[var(--md-sys-color-primary)]" />
      <h2 className="md-title-large mt-4">{title}</h2>
      <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">{body}</p>
      <span className="md-label-medium mt-5 inline-flex text-[var(--md-sys-color-primary)]">Open</span>
    </Link>
  );
}
