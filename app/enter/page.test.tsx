// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";

const useSessionMock = vi.fn();
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import EnterPage from "./page";

function session(hydrated: boolean, setActor = vi.fn(), setCustomerDoor = vi.fn()) {
  return { setActor, setCustomerDoor, hydrated, brand: brands.cdw, graph: initialSessionGraph };
}

describe("entry", () => {
  beforeEach(() => push.mockReset());
  afterEach(cleanup);

  it("paints the full chooser before the stored session is known", () => {
    useSessionMock.mockReturnValue(session(false));
    const markup = renderToStaticMarkup(<EnterPage />);
    expect(markup).toContain("<main");
    expect(markup).toContain("<h1");
    expect(markup).toContain("Turn AI interest into a booked hackathon");
    expect(markup).toContain("One session, three views. The view changes what you can do, not the evidence.");
    expect(markup).not.toContain("Partner network");
    expect(markup).toContain("Partner development manager");
    expect(markup).toContain("Priya Raghavan · Platform vendor");
    expect(markup).toContain("Ravi Menon · CDW");
    expect(markup).toContain("Arriving from a campaign or trial");
    expect(markup).toContain("Open portfolio");
    expect(markup).toContain("Open session");
    expect(markup).toContain("Find your account");
    expect(markup).toContain("Illustrative demo. Nothing here sends mail, writes to a CRM, or files a claim.");
    expect(markup).not.toContain("Google");
    expect(markup).not.toContain("disabled");
    expect(markup.match(/<button/g)).toHaveLength(3);
  });

  it("routes each card once hydrated", () => {
    const setActor = vi.fn();
    const setCustomerDoor = vi.fn();
    useSessionMock.mockReturnValue(session(true, setActor, setCustomerDoor));

    const view = render(<EnterPage />);
    fireEvent.click(view.getByRole("button", { name: /^Customer/ }));
    expect(setActor).toHaveBeenCalledWith("customer");
    expect(setCustomerDoor).toHaveBeenCalledWith(true);
    expect(push).toHaveBeenCalledWith("/customer");

    fireEvent.click(view.getByRole("button", { name: /^Partner(?! development)/ }));
    expect(setActor).toHaveBeenCalledWith("partner");
    expect(push).toHaveBeenCalledWith("/home");

    fireEvent.click(view.getByRole("button", { name: /^Partner development manager/ }));
    expect(setActor).toHaveBeenCalledWith("pdm");
    expect(push).toHaveBeenCalledWith("/home");
    expect(setCustomerDoor).toHaveBeenCalledTimes(1);
  });

  it("keeps a click made before hydration and applies it afterwards", () => {
    const setActor = vi.fn();
    const setCustomerDoor = vi.fn();
    useSessionMock.mockReturnValue(session(false, setActor, setCustomerDoor));

    const view = render(<EnterPage />);
    fireEvent.click(view.getByRole("button", { name: /^Partner development manager/ }));
    expect(setActor).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    useSessionMock.mockReturnValue(session(true, setActor, setCustomerDoor));
    view.rerender(<EnterPage />);
    expect(setActor).toHaveBeenCalledWith("pdm");
    expect(setActor).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/home");
    expect(push).toHaveBeenCalledTimes(1);
    expect(setCustomerDoor).not.toHaveBeenCalled();
  });
});
