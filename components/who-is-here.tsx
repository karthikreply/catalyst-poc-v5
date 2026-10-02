"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, LayoutDashboard, Presentation } from "lucide-react";

import { useSession } from "@/components/session-provider";
import type { Actor } from "@/lib/seed";
import { viewerForActor } from "@/lib/session";

export const chooserHeading = "Turn AI interest into a booked hackathon";
export const chooserSubtitle = "One session, three views. The view changes what you can do, not the evidence.";
export const chooserFooter = "Illustrative demo. Nothing here sends mail, writes to a CRM, or files a claim.";

type ChooserId = Extract<Actor, "pdm" | "partner" | "customer">;

const cards: {
  id: ChooserId;
  title: string;
  icon: typeof LayoutDashboard;
  body: string;
  action: string;
}[] = [
  {
    id: "pdm",
    title: "Partner development manager",
    icon: LayoutDashboard,
    body: "See your partners' sessions, booked hackathons and signed pilots.",
    action: "Open portfolio",
  },
  {
    id: "partner",
    title: "Partner",
    icon: Presentation,
    body: "Run a session with a customer, from scoping to a booked hackathon.",
    action: "Open session",
  },
  {
    id: "customer",
    title: "Customer",
    icon: Building2,
    body: "Look up your account and see what your team gets.",
    action: "Find your account",
  },
];

export function WhoIsHere() {
  const router = useRouter();
  const { setActor, setCustomerDoor, hydrated, brand, graph } = useSession();
  // A click before hydration waits here, then runs once the stored session is known.
  const pending = useRef<ChooserId | null>(null);

  function apply(id: ChooserId) {
    if (id === "customer") {
      setActor("customer");
      setCustomerDoor(true);
      router.push("/customer");
      return;
    }
    setActor(id);
    router.push("/home");
  }

  useEffect(() => {
    if (!hydrated || !pending.current) return;
    const id = pending.current;
    pending.current = null;
    apply(id);
  });

  function choose(id: ChooserId) {
    if (hydrated) {
      apply(id);
      return;
    }
    pending.current = id;
  }

  function persona(id: ChooserId) {
    if (id === "customer") return "Arriving from a campaign or trial";
    const viewer = viewerForActor(id, brand, graph);
    return `${viewer.name} · ${viewer.org}`;
  }

  return (
    <main className="min-h-screen bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)]">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">{chooserHeading}</h1>
        <p className="md-body-large mt-3 max-w-3xl text-[var(--md-sys-color-on-surface-variant)]">{chooserSubtitle}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => choose(card.id)}
                className="md-card-outlined flex flex-col p-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_5%,var(--md-sys-color-surface))] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]"
              >
                <span className="grid size-10 place-items-center rounded-[var(--md-sys-shape-small)] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="md-title-large mt-5 block">{card.title}</span>
                <span className="md-body-medium mt-1 block text-[var(--md-sys-color-on-surface-variant)]">{persona(card.id)}</span>
                <span className="md-body-large mt-4 block">{card.body}</span>
                <span className="md-label-large mt-auto inline-flex items-center gap-1.5 pt-6 text-[var(--md-sys-color-primary)]">
                  {card.action} <ArrowRight className="size-4" aria-hidden />
                </span>
              </button>
            );
          })}
        </div>

        <p className="md-body-medium mt-10 text-[var(--md-sys-color-on-surface-variant)]">{chooserFooter}</p>
      </div>
    </main>
  );
}
