"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { resolveSkin, withBrandPeople } from "@/lib/brands";
import type { Mechanic } from "@/lib/seed";
import { isCustomerViewer, customerFormatLabels, customerHasAccount, earliestIncompleteStep, hackathonGuardCopy, sessionReachedShortlist } from "@/lib/session";
import { cn } from "@/lib/utils";
import { mergesSessionHeader } from "@/lib/vendor-shell";
import { useSession } from "./session-provider";

const sessionSteps = [
  { href: "/scope", label: "Scope" },
  { href: "/plan", label: "Plan" },
  { href: "/run", label: "Run" },
  { href: "/rank", label: "Rank" },
  { href: "/hackathon", label: "Hackathon" },
  { href: "/artifact", label: "Business case" },
  { href: "/pilot-spec", label: "Pilot" },
];

export function BrandFlowFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { brand, graph, setMechanic, setFocus, canEditSession, viewer } = useSession();
  const funding = pathname.startsWith("/funding");
  const tryIt = pathname.startsWith("/try");
  const reached = sessionReachedShortlist(graph);
  const hackathonFocus = graph.session.focus === "hackathon" && reached;
  const steps = hackathonFocus ? sessionSteps.slice(3) : sessionSteps;
  const guardStep = earliestIncompleteStep(graph);
  const activeIndex = tryIt ? -1 : Math.max(0, steps.findIndex((step) => pathname.startsWith(step.href)));
  const nextStep = activeIndex < 0 ? { href: "/rank", label: "Rank" } : steps[(activeIndex + 1) % steps.length];
  const sessionHeader = mergesSessionHeader(pathname);
  const customer = isCustomerViewer(viewer.actor);
  const showAccount = sessionHeader && (!customer || customerHasAccount(viewer.actor, graph));
  const people = withBrandPeople(brand);
  const logo = resolveSkin(brand).logo.text ?? brand.mark;
  const facilitation = graph.session.delivery === "self-service"
    ? "Customer self-service · uncommon scale path · no partner facilitator present"
    : graph.session.delivery === "google-facilitated"
      ? customer
        ? `Facilitated by ${brand.partnerName}`
        : `Google-facilitated by ${graph.session.facilitator?.name ?? "Priya Raghavan"} · Google`
      : `Facilitated by ${graph.session.facilitator?.name ?? "Ravi Menon"} · ${people.facilitatorOrg}`;

  return (
    <div
      className="brand-surface min-h-[calc(100vh-112px)] border-t-4"
      style={{
        "--brand-accent": brand.accent,
        "--brand-accent-dark": brand.accentDark,
        borderTopColor: brand.accent,
      } as React.CSSProperties}
    >
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2 lg:px-8">
          <div className="relative flex min-w-fit items-center gap-3">
            <div>
              <p className="text-[var(--md-sys-color-primary)]" style={{ fontWeight: "var(--brand-logo-weight)", letterSpacing: "var(--brand-letter-spacing)" }}>{logo}</p>
              {customer && <p className="text-xs text-black/50">Your engagement</p>}
            </div>
            <span className="h-5 w-px bg-black/15" />
            {showAccount ? (
              <div>
                <h1 className="text-sm font-semibold leading-tight">{graph.session.customerName} · value session</h1>
                <p className="mt-0.5 text-xs text-black/50">{customer ? customerFormatLabels[graph.session.mechanic] : facilitation}</p>
              </div>
            ) : !customer ? (
              <span className="text-sm font-semibold">{brand.productName}</span>
            ) : null}
          </div>

          {funding ? (
            <div className="ml-auto text-right">
              <p className="text-xs text-black/45">Business case</p>
              <p className="text-sm font-semibold">Funding request</p>
            </div>
          ) : <nav aria-label="Value session steps" className="ml-auto hidden items-center md:flex">
            {hackathonFocus && (
              <Link href="/run" className="mr-2 text-xs font-medium text-black/70 underline-offset-2 hover:underline">
                Back to the session
              </Link>
            )}
            {steps.map((step, index) => {
              const active = index === activeIndex;
              const complete = index < activeIndex;
              return (
                <div key={step.href} className="flex items-center">
                  {index > 0 && <span className="mx-1 h-px w-4 bg-black/15 lg:w-7" />}
                  <Link
                    href={step.href}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-sm px-2 py-2 text-xs font-medium text-black/48 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand-accent)]",
                      active && "text-black",
                      complete && "text-black/70",
                    )}
                  >
                    <span
                      className={cn("grid size-5 place-items-center rounded-full border border-black/20 text-[10px]", (active || complete) && "border-transparent text-white")}
                      style={active || complete ? { background: brand.accent } : undefined}
                    >
                      {complete ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="whitespace-nowrap">{step.label}</span>
                  </Link>
                </div>
              );
            })}
          </nav>}

          {sessionHeader && !customer && (
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-black/60">Format</span>
              <select
                value={graph.session.mechanic}
                disabled={!canEditSession}
                onChange={(event) => setMechanic(event.target.value as Mechanic)}
                className="h-9 rounded-sm border border-black/25 bg-white px-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              >
                <option value="value-sprint">Value sprint</option>
                <option value="ghost-ledger">Ghost ledger</option>
              </select>
            </label>
          )}
        </div>
      </header>
      <div className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 lg:px-8">
          <button
            type="button"
            aria-pressed={graph.session.focus === "session"}
            onClick={() => setFocus("session")}
            className="text-sm font-semibold"
          >
            Session
          </button>
          {reached ? (
            <button
              type="button"
              aria-pressed={graph.session.focus === "hackathon"}
              onClick={() => setFocus("hackathon")}
              className="text-sm font-semibold"
            >
              Hackathon
            </button>
          ) : (
            <p className="text-sm text-black/70">
              {hackathonGuardCopy}{" "}
              <Link href={guardStep.href} className="font-semibold underline underline-offset-2">{guardStep.label}</Link>
            </p>
          )}
        </div>
      </div>
      <main>{children}</main>
      {!(customer && sessionHeader) && (
        <div className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 md:hidden">
          <Link href={funding ? "/artifact" : nextStep.href} className={buttonVariants({ size: "sm", className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>
            {funding ? "Back to business case" : `Next: ${nextStep.label}`}
          </Link>
        </div>
      )}
    </div>
  );
}
