import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/components/session-provider", () => ({
  useSession: () => ({
    setActor: vi.fn(),
    setCustomerDoor: vi.fn(),
    hydrated: true,
    brand: brands.cdw,
    graph: initialSessionGraph,
  }),
}));

import Home from "./page";

describe("shared home", () => {
  it("opens on the chooser", () => {
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Turn AI interest into a booked hackathon");
    expect(markup).toContain("Partner development manager");
    expect(markup).toContain("Ravi Menon · CDW");
    expect(markup).toContain("Customer");
    expect(markup).not.toContain("Google");
    expect(markup).not.toContain("Illustrative portfolio");
  });
});
