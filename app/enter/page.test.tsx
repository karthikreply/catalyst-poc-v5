// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSessionMock = vi.fn();
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import EnterPage from "./page";

describe("entry", () => {
  beforeEach(() => push.mockReset());

  it("offers the three cards and sends the customer through the customer door", () => {
    const setActor = vi.fn();
    const setCustomerDoor = vi.fn();
    useSessionMock.mockReturnValue({ setActor, setCustomerDoor, hydrated: true });
    const markup = renderToStaticMarkup(<EnterPage />);
    expect(markup).toContain("Google PDM");
    expect(markup).toContain("Partner");
    expect(markup).toContain("Ravi Menon");
    expect(markup).toContain("Customer");
    expect(markup).not.toContain("Partner network");
    expect(markup).not.toContain("Priya");

    const view = render(<EnterPage />);
    fireEvent.click(view.getByRole("button", { name: /^Customer/ }));
    expect(setActor).toHaveBeenCalledWith("customer");
    expect(setCustomerDoor).toHaveBeenCalledWith(true);
    expect(push).toHaveBeenCalledWith("/customer");

    fireEvent.click(view.getByRole("button", { name: /^Partner/ }));
    expect(setActor).toHaveBeenCalledWith("partner");
    expect(push).toHaveBeenCalledWith("/home");

    fireEvent.click(view.getByRole("button", { name: /^Google PDM/ }));
    expect(setActor).toHaveBeenCalledWith("pdm");
    expect(push).toHaveBeenCalledWith("/home");
  });
});
