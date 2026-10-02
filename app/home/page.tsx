"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeDollarSign, ChartNoAxesCombined } from "lucide-react";

import { useSession } from "@/components/session-provider";
import { formatPortfolioMoney, portfolioHeadlines, portfolioLine, portfolioPartners } from "@/lib/pdm-portfolio";
import { catalogSolutionById, customerSponsor, handoffLabel, isCustomerViewer } from "@/lib/session";

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
  const { graph, brand, setFocus } = useSession();
  const booked = Boolean(graph.hackathon?.booked);
  const titles = booked
    ? graph.hackathon!.solutionIds.flatMap((id) => {
        const solution = catalogSolutionById(id, graph);
        return solution ? [solution.title] : [];
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="md-card-outlined p-6" aria-labelledby="portfolio-title">
          <h1 id="portfolio-title" className="md-headline-medium">Illustrative portfolio</h1>
          <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">{portfolioLine()}</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Headline term="Sessions" detail={String(portfolioHeadlines.sessions)} />
            <Headline term="Hackathons booked" detail={String(portfolioHeadlines.booked)} />
            <Headline term="Pilots signed" detail={String(portfolioHeadlines.signed)} />
            <Headline term="Fund approved" detail={`${formatPortfolioMoney(portfolioHeadlines.fundApproved)} across ${portfolioHeadlines.claims} claims`} />
            <Headline term="Pipeline" detail={formatPortfolioMoney(portfolioHeadlines.pipeline)} />
          </dl>
          <table className="mt-6 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]">
                <th className="py-2 pr-3 font-medium">Partner</th>
                <th className="py-2 pr-3 font-medium">Sessions</th>
                <th className="py-2 pr-3 font-medium">Hackathons booked</th>
                <th className="py-2 pr-3 font-medium">Pilots signed</th>
                <th className="py-2 pr-3 font-medium">Fund approved</th>
                <th className="py-2 font-medium">Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {portfolioPartners.map((row) => (
                <tr key={row.partner} className="border-b border-[var(--md-sys-color-outline-variant)]">
                  <td className="py-2 pr-3">{row.partner}</td>
                  <td className="py-2 pr-3">{row.sessions}</td>
                  <td className="py-2 pr-3">{row.booked}</td>
                  <td className="py-2 pr-3">{row.signed}</td>
                  <td className="py-2 pr-3">{formatPortfolioMoney(row.fundApproved)}</td>
                  <td className="py-2">{formatPortfolioMoney(row.pipeline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="md-card-outlined p-6" aria-labelledby="live-session-title">
          <h2 id="live-session-title" className="md-title-large">Live session</h2>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Customer</dt>
              <dd className="md-title-medium mt-1">{graph.session.customerName}</dd>
            </div>
            <div>
              <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Partner</dt>
              <dd className="md-title-medium mt-1">{brand.partnerName}</dd>
            </div>
            <div>
              <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Hackathon</dt>
              <dd className="md-title-medium mt-1">{booked ? "Booked" : "Not booked"}</dd>
            </div>
            {booked && (
              <div>
                <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Date</dt>
                <dd className="md-title-medium mt-1">{graph.hackathon?.date}</dd>
              </div>
            )}
            {graph.outcome.pilotPick && (
              <div>
                <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Pilot</dt>
                <dd className="md-title-medium mt-1">Pilot signed</dd>
              </div>
            )}
            <div>
              <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Handoff</dt>
              <dd className="md-title-medium mt-1">{handoffLabel(graph.session.handoff)}</dd>
            </div>
          </dl>
          {booked && titles.length > 0 && (
            <ul className="mt-4 space-y-1">
              {titles.map((title) => <li key={title} className="md-body-medium">{title}</li>)}
            </ul>
          )}
          <div className="mt-6 flex flex-col items-start gap-3">
            <Link href="/scope" onClick={() => setFocus("session")} className="md-button-filled">Open the session</Link>
            <Link href="/funding" className="md-button-outlined">Review funding request</Link>
            <Link href="/telemetry" className="md-button-outlined">View the rows</Link>
          </div>
        </section>
      </div>
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
