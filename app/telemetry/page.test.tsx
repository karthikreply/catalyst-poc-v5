import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { startSampleRun } from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import TelemetryPage from "./page";

describe("telemetry sample run column", () => {
  it("shows the sample run column and the booked-after line", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      hydrated: true,
    });
    const markup = renderToStaticMarkup(<TelemetryPage />);
    expect(markup).toContain("Sample run");
    expect(markup).toMatch(/Booked after a sample run: \d+ of \d+ that ran one/);
    expect(markup).toContain("Yes");
    expect(markup).toContain("—");

    const ran = startSampleRun(initialSessionGraph, "partner", "Ravi Menon", "2026-10-01T00:00:00.000Z");
    useSessionMock.mockReturnValue({
      graph: ran,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      hydrated: true,
    });
    const live = renderToStaticMarkup(<TelemetryPage />);
    expect(live).toContain("Yes");
  });

  it("shows the five funnel stages and the drop from the previous step", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.cdw,
      viewer: { actor: "pdm", name: "Priya Raghavan", org: "Google" },
      hydrated: true,
    });
    const markup = renderToStaticMarkup(<TelemetryPage />);
    for (const stage of ["Scoped", "Run", "Hackathon proposed", "Hackathon booked", "Pilot signed"]) {
      expect(markup).toContain(stage);
    }
    expect(markup).toMatch(/\d+% did not continue/);
    expect(markup).toContain("All partners");
    expect(markup).not.toContain("Back to pilot spec");
    expect(markup).not.toContain('href="/pilot-spec"');
  });

  it("limits the partner breakdown to the partner's own rows", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      hydrated: true,
    });
    const markup = renderToStaticMarkup(<TelemetryPage />);
    expect(markup).toContain("Back to pilot spec");
    const partnerBreakdown = markup.slice(markup.indexOf("Sessions by partner"), markup.indexOf("Sessions by pattern"));
    expect(partnerBreakdown).toContain("CDW");
    expect(partnerBreakdown).not.toContain("Insight");
    expect(partnerBreakdown).not.toContain("SoftwareOne");
    expect(partnerBreakdown).not.toContain("SHI");
    expect(markup).toContain("By quarter");
    expect(markup).toContain("CDW");
  });
});
