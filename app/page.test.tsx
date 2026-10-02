import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/components/session-provider", () => ({
  useSession: () => ({ setActor: vi.fn(), setCustomerDoor: vi.fn(), hydrated: true }),
}));

import Home from "./page";

describe("shared home", () => {
  it("opens on the chooser", () => {
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Who is here?");
    expect(markup).toContain("Google PDM");
    expect(markup).toContain("Ravi Menon");
    expect(markup).toContain("Customer");
    expect(markup).not.toContain("Illustrative portfolio");
  });
});
