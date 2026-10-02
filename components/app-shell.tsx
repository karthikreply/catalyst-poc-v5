"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  LayoutDashboard,
  Presentation,
} from "lucide-react";

import { isCustomerViewer } from "@/lib/session";
import { breadcrumbForPath, isBrandFlowPath, navItemsForActor, type VendorNavItem } from "@/lib/vendor-shell";
import { BrandFlowFrame } from "./brand-flow-frame";
import { useSession } from "./session-provider";

const navIcons: Record<VendorNavItem["label"], typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  "My sessions": CalendarDays,
  Programs: Boxes,
  "Value sessions": Presentation,
  Funding: BadgeDollarSign,
  Telemetry: ChartNoAxesCombined,
  Support: CircleHelp,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { viewer, hydrated, brand } = useSession();
  const customer = isCustomerViewer(viewer.actor);
  const breadcrumbs = breadcrumbForPath(pathname, viewer.actor);
  const brandFlow = isBrandFlowPath(pathname, viewer.actor);
  const navItems = navItemsForActor(viewer.actor);
  const wordmark = viewer.actor === "pdm" ? "Google" : brand.partnerName;

  useEffect(() => {
    if (!hydrated) return;
    document.title = wordmark;
  }, [hydrated, wordmark]);

  // The stored viewer is unknown until hydration.
  if (!hydrated) return null;
  if (pathname === "/" || pathname === "/enter" || pathname.startsWith("/enter/")) return <main>{children}</main>;

  return (
    <div className="md-shell">
      <header className="md-top-app-bar sticky top-0 z-50 flex h-16 items-center gap-4 px-4 md:px-6">
        <Link href={customer ? "/customer" : "/home"} className="flex items-center gap-3 rounded-[var(--md-sys-shape-small)]">
          <span className="md-title-medium">{wordmark}</span>
        </Link>
        <Link href="/enter" className="md-label-large ml-auto text-[var(--md-sys-color-primary)]">
          Switch person
        </Link>
      </header>

      <div className="grid min-h-[calc(100vh-64px)] md:grid-cols-[184px_1fr]">
        <aside className="md-nav-rail hidden p-3 md:block">
          <nav aria-label={customer ? "Your engagement" : wordmark}>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = navIcons[item.label];
                const active = item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false;
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`md-label-large flex min-h-14 items-center gap-3 rounded-[var(--md-sys-shape-large)] px-3 ${active ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]" : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]"}`}
                      >
                        <Icon className="size-5" /> {item.label}
                      </Link>
                    ) : (
                      <div aria-disabled="true" className="md-label-large flex min-h-14 items-center gap-3 rounded-[var(--md-sys-shape-large)] px-3 text-[var(--md-sys-color-on-surface-variant)] opacity-55">
                        <Icon className="size-5" />
                        <span>{item.label}<span className="md-label-medium block">Illustrative</span></span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex h-12 items-center gap-2 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-4 md:px-6">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb} className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">
                {index > 0 && <span className="mr-2">/</span>}{crumb}
              </span>
            ))}
          </nav>
          {brandFlow ? <BrandFlowFrame>{children}</BrandFlowFrame> : <main>{children}</main>}
        </div>
      </div>
    </div>
  );
}
