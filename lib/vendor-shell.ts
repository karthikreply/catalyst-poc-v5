import type { Actor } from "./seed";
import { isCustomerViewer } from "./session";

export const vendorNavItems = [
  { label: "Dashboard", href: "/home", illustrative: false },
  { label: "My sessions", href: "/sessions", illustrative: false },
  { label: "Programs", href: null, illustrative: true },
  { label: "Value sessions", href: "/scope", illustrative: false },
  { label: "Funding", href: "/funding", illustrative: false },
  { label: "Telemetry", href: "/telemetry", illustrative: false },
  { label: "Support", href: null, illustrative: true },
] as const;

export type VendorNavItem = {
  label: (typeof vendorNavItems)[number]["label"];
  href: "/home" | "/customer" | "/sessions" | "/scope" | "/funding" | "/telemetry" | null;
  illustrative: boolean;
};

const sessionNavLabels: readonly VendorNavItem["label"][] = ["My sessions", "Value sessions"];

/** Partner keeps the program rail. The PDM has no session items. The customer sees this engagement only. */
export function navItemsForActor(actor: Actor): VendorNavItem[] {
  if (actor === "pdm") return vendorNavItems.filter((item) => !sessionNavLabels.includes(item.label)).map((item) => ({ ...item }));
  if (!isCustomerViewer(actor)) return vendorNavItems.map((item) => ({ ...item }));
  return [
    { label: "Dashboard", href: "/customer", illustrative: false },
    { label: "Value sessions", href: "/scope", illustrative: false },
    { label: "Funding", href: "/funding", illustrative: false },
  ];
}

const flowLabels: Record<string, string> = {
  "/scope": "Scope",
  "/plan": "Plan",
  "/run": "Run",
  "/rank": "Rank",
  "/hackathon": "Hackathon",
  "/try": "Try it",
  "/artifact": "Business case",
  "/pilot-spec": "Pilot",
};

export function isBrandFlowPath(pathname: string, actor: Actor) {
  if (pathname.startsWith("/funding")) return actor === "partner";
  return Object.keys(flowLabels).some((path) => pathname.startsWith(path));
}

export const partnerHeldCopy = "Sessions are partner-held.";

/** The PDM does not open sessions. The list and every session step are the partner's. */
export function isPartnerHeldPath(pathname: string, actor: Actor) {
  if (actor !== "pdm") return false;
  return pathname.startsWith("/sessions") || Object.keys(flowLabels).some((path) => pathname.startsWith(path));
}

export function mergesSessionHeader(pathname: string) {
  return pathname.startsWith("/run");
}

export function breadcrumbForPath(pathname: string, actor: Actor) {
  const root = isCustomerViewer(actor) ? "Your engagement" : actor === "pdm" ? "Google" : "Home";
  if (pathname === "/" || pathname.startsWith("/enter")) return [root];
  if (pathname === "/home" || pathname.startsWith("/home/")) return [root, "Dashboard"];
  if (pathname.startsWith("/sessions")) return [root, "My sessions"];
  if (pathname.startsWith("/funding")) return [root, "Funding"];
  if (pathname.startsWith("/telemetry")) return [root, "Telemetry"];
  if (pathname.startsWith("/customer")) return [root, "Customer"];
  const flowPath = Object.keys(flowLabels).find((path) => pathname.startsWith(path));
  return flowPath
    ? [root, "Value sessions", flowLabels[flowPath]]
    : [root];
}
