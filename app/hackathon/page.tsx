"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { BookHackathonAction } from "@/components/book-hackathon-action";
import { HackathonBookingForm } from "@/components/hackathon-booking-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { SolutionProductList } from "@/components/what-the-three-days-will-be";
import { useSession } from "@/components/session-provider";
import {
  bookBlockReason,
  bookedSolutionTitles,
  canBookHackathon,
  canChooseShortlist,
  canRecordHackathonDecision,
  catalogSolutionById,
  earliestIncompleteStep,
  googleCalendarComposeUrl,
  hackathonGuardCopy,
  isCustomerViewer,
  pilotPickTitle,
  selectedSolutions,
  sessionReachedShortlist,
} from "@/lib/session";

function hackathonStateLabel(graph: ReturnType<typeof useSession>["graph"]) {
  if (graph.hackathon?.booked) return "Booked";
  if (graph.ranking.locked && graph.ranking.selected.length === 3) return "Book";
  return "Choose";
}

function pilotStatus(graph: ReturnType<typeof useSession>["graph"]) {
  if (graph.session.pilotSigned) return `Recorded by ${graph.session.pilotSigned.recordedBy}`;
  if (graph.outcome.hackathonDecision === "not-going-ahead") return "Not going ahead";
  const title = pilotPickTitle(graph);
  if (title) return title;
  if (graph.hackathon?.booked) return "Not recorded";
  return "Not booked";
}

export function HackathonGuard({ graph }: { graph: ReturnType<typeof useSession>["graph"] }) {
  const next = earliestIncompleteStep(graph);
  return (
    <div className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight">Hackathon</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">{hackathonGuardCopy}</p>
        <Link href={next.href} className={`${buttonVariants()} mt-5 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]`}>
          {next.label}
        </Link>
      </div>
    </div>
  );
}

export default function HackathonPage() {
  const {
    graph,
    brand,
    viewer,
    bookHackathon,
    toggleSelected,
    setPilotPick,
    recordNotGoingAhead,
    markPilotSigned,
  } = useSession();
  const calendarRef = useRef<HTMLDivElement>(null);
  const [highlightCalendar, setHighlightCalendar] = useState(false);
  const booked = Boolean(graph.hackathon?.booked);
  useEffect(() => {
    if (!highlightCalendar || !booked) return;
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightCalendar, booked]);

  if (!sessionReachedShortlist(graph)) return <HackathonGuard graph={graph} />;

  const customer = isCustomerViewer(viewer.actor);
  const pdm = viewer.actor === "pdm";
  const state = hackathonStateLabel(graph);
  const titles = booked ? bookedSolutionTitles(graph) : selectedSolutions(graph).map((solution) => solution.title);
  const solutions = booked
    ? graph.hackathon!.solutionIds.flatMap((id) => {
        const solution = catalogSolutionById(id, graph);
        return solution ? [solution] : [];
      })
    : selectedSolutions(graph);
  const mayRecord = canRecordHackathonDecision(viewer.actor, graph);
  const mayChoose = canChooseShortlist(viewer.actor, graph);
  const reason = bookBlockReason(viewer.actor, graph);
  const showForm = !booked && !reason;
  const calendarUrl = booked ? googleCalendarComposeUrl(graph, brand.partnerName) : "";
  const partnerOfRecord = graph.session.facilitator?.name || brand.partnerName;

  return (
    <div className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-black/55">{state}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{customer ? "Your hackathon" : "Hackathon"}</h1>
        {booked && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" aria-label="Next step">
            <span className="font-semibold">Next: the business case</span>
            <Link href="/artifact" className="font-semibold text-[var(--brand-accent)] underline underline-offset-2">
              Open the business case
            </Link>
          </p>
        )}
        {customer && graph.session.delivery !== "self-service" && !booked && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/70">Choose three on Rank.</p>
        )}
        {customer && graph.session.delivery === "self-service" && !booked && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/70">Choose three. You book the hackathon.</p>
        )}

        {pdm && (
          <section className="mt-6 rounded-sm border border-black/10 bg-white p-6" aria-label="Hackathon readout">
            <h2 className="text-lg font-semibold">Readout</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-black/45">The three solutions</dt>
                <dd className="mt-1 text-sm">{titles.length ? titles.join(", ") : "Not chosen"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-black/45">Partner of record</dt>
                <dd className="mt-1 text-sm">{partnerOfRecord}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-black/45">Booked</dt>
                <dd className="mt-1 text-sm">{booked ? `Booked · ${graph.hackathon?.date}` : "Not booked"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-black/45">Pilot status</dt>
                <dd className="mt-1 text-sm">{pilotStatus(graph)}</dd>
              </div>
            </dl>
          </section>
        )}

        {!pdm && (
          <section className="mt-6 rounded-sm border border-black/10 bg-white p-6" aria-label="The three solutions">
            <h2 className="text-lg font-semibold">{booked ? "The three solutions" : "Rank"}</h2>
            {solutions.length === 0 ? (
              <p className="mt-2 text-sm text-black/70">Choose three on <Link href="/rank" className="underline underline-offset-2">Rank</Link>.</p>
            ) : (
              <ul className="mt-4 divide-y divide-black/10 border-y border-black/10">
                {solutions.map((solution) => (
                  <li key={solution.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{solution.title}</p>
                      {mayChoose && (
                        <Button type="button" size="sm" variant="outline" onClick={() => toggleSelected(solution.id)}>
                          {graph.ranking.selected.includes(solution.id) ? "Selected" : "Select"}
                        </Button>
                      )}
                    </div>
                    <SolutionProductList title={solution.title} products={solution.products} />
                  </li>
                ))}
              </ul>
            )}
            {!booked && solutions.length > 0 && solutions.length < 3 && (
              <p className="mt-3 text-sm text-black/70">{solutions.length} of 3 chosen. Choose the rest on <Link href="/rank" className="underline underline-offset-2">Rank</Link>.</p>
            )}
            {booked && <p className="mt-4 text-sm font-semibold">Date · {graph.hackathon?.date}</p>}
          </section>
        )}

        {!booked && canBookHackathon(viewer.actor) && <div className="mt-5"><BookHackathonAction primary /></div>}

        {showForm && (
          <HackathonBookingForm
            key={graph.ranking.selected.join("-")}
            graph={graph}
            selectedTitles={titles}
            canEdit
            bookHackathon={(draft) => {
              bookHackathon(draft);
              setHighlightCalendar(true);
            }}
          />
        )}

        {booked && !pdm && (
          <div
            ref={calendarRef}
            id="hackathon-calendar"
            className={`mt-5 flex flex-wrap gap-3 rounded-sm ${highlightCalendar ? "bg-[color-mix(in_srgb,var(--brand-accent)_14%,white)] p-4 ring-2 ring-[var(--brand-accent)]" : ""}`}
          >
            {calendarUrl && (
              <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>
                {customer ? "Open calendar" : "Add to Google Calendar"}
              </a>
            )}
            {customer ? (
              <Link href="/funding" className={buttonVariants({ variant: "outline" })}>View funding pack</Link>
            ) : (
              <Link href="/artifact" className={buttonVariants({ variant: "outline" })}>Start the DAF claim</Link>
            )}
          </div>
        )}

        {booked && mayRecord && (
          <section className="mt-6 rounded-sm border border-black/10 bg-white p-6" aria-label="Go or no-go">
            <h2 className="text-lg font-semibold">Go or no-go</h2>
            <p className="mt-1 text-sm text-black/62">Record Go on one of the three solutions, or not going ahead.</p>
            <ul className="mt-4 space-y-2">
              {solutions.map((solution) => {
                const going = graph.outcome.hackathonDecision === "go" && graph.outcome.pilotPick === solution.id;
                return (
                  <li key={solution.id} className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{solution.title}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={going ? "default" : "outline"}
                      aria-pressed={going}
                      onClick={() => setPilotPick(solution.id)}
                      className={going ? "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" : undefined}
                    >
                      Go
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Button type="button" variant="outline" className="mt-4" onClick={recordNotGoingAhead}>
              Not going ahead
            </Button>
            {graph.outcome.hackathonDecision === "go" && !graph.session.pilotSigned && (
              <Button type="button" className="mt-4 ml-3 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" onClick={markPilotSigned}>
                Mark pilot signed
              </Button>
            )}
            <p className="mt-3 text-sm" role="status">{pilotStatus(graph)}</p>
          </section>
        )}

        {booked && !mayRecord && !pdm && (
          <p className="mt-5 text-sm" role="status">Pilot status · {pilotStatus(graph)}</p>
        )}

      </div>
    </div>
  );
}
