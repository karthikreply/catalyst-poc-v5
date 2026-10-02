"use client";

import { useRouter } from "next/navigation";

import { useSession } from "@/components/session-provider";

const cards = [
  {
    id: "pdm",
    title: "Google PDM",
    body: "Opens the portfolio for the partners you cover.",
  },
  {
    id: "partner",
    title: "Partner",
    body: "Ravi Menon. Opens his session.",
  },
  {
    id: "customer",
    title: "Customer",
    body: "Look up your account, or add it.",
  },
] as const;

export default function EnterPage() {
  const router = useRouter();
  const { setActor, setCustomerDoor, hydrated } = useSession();
  if (!hydrated) return null;

  function choose(id: (typeof cards)[number]["id"]) {
    if (id === "customer") {
      setActor("customer");
      setCustomerDoor(true);
      router.push("/customer");
      return;
    }
    setActor(id);
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <h1 className="md-display-small">Who is here?</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => choose(card.id)}
            className="md-card-outlined p-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_5%,var(--md-sys-color-surface))]"
          >
            <p className="md-title-medium">{card.title}</p>
            <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">{card.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
