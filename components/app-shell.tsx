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

import { brands, skinToCssVars, type BrandId } from "@/lib/brands";
import { isCustomerViewer } from "@/lib/session";
import { breadcrumbForPath, isBrandFlowPath, isPartnerHeldPath, navItemsForActor, partnerHeldCopy, type VendorNavItem } from "@/lib/vendor-shell";
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
  const { viewer, hydrated, brand, brandId, setBrandId } = useSession();
  const customer = isCustomerViewer(viewer.actor);
  const breadcrumbs = breadcrumbForPath(pathname, viewer.actor);
  const brandFlow = isBrandFlowPath(pathname, viewer.actor);
  const navItems = navItemsForActor(viewer.actor);
  const pdm = viewer.actor === "pdm";
  const wordmark = pdm ? "Google" : brand.partnerName;
  const partnerHeld = isPartnerHeldPath(pathname, viewer.actor);
  // The partner and customer chrome wears the brand skin. The PDM chrome keeps the defaults.
  const skin = pdm ? undefined : (skinToCssVars(brand) as React.CSSProperties);

  useEffect(() => {
    if (!hydrated) return;
    document.title = wordmark;
  }, [hydrated, wordmark]);

  // The chooser paints before hydration and brings its own <main>.
  if (pathname === "/" || pathname === "/enter" || pathname.startsWith("/enter/")) return <>{children}</>;
  // The stored viewer is unknown until hydration.
  if (!hydrated) return null;

  return (
    <div>
      <div className="demo-bar flex h-9 items-center gap-4 px-4">
        <span>Mock partner portal · illustrative</span>
        <span className="ml-auto">Viewing as {viewer.name}</span>
        <label className="flex items-center gap-2">
          Brand
          <select
            aria-label="Brand"
            value={brandId}
            disabled={pdm}
            title={pdm ? "The vendor view doesn't take a partner skin." : undefined}
            onChange={(event) => setBrandId(event.target.value as BrandId)}
          >
            {Object.values(brands).map((option) => (
              <option key={option.id} value={option.id}>{option.partnerName}</option>
            ))}
          </select>
        </label>
        <Link href="/enter">Switch person</Link>
      </div>
    <div className="md-shell" data-skin={pdm ? "vendor" : "brand"} style={skin}>
      <header className="md-top-app-bar sticky top-0 z-50 flex h-16 items-center gap-4 px-4 md:px-6">
        <Link href={customer ? "/customer" : "/home"} className="flex items-center gap-3 rounded-[var(--md-sys-shape-small)]">
          {pdm ? (
            <span className="md-title-medium">{wordmark}</span>
          ) : brand.skin.logo?.kind === "image" && brand.skin.logo.src ? (
            // A partner-supplied file. The three demo skins are wordmarks, so this path is unused today.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.skin.logo.src} alt={brand.skin.logo.text ?? brand.mark} height={brand.skin.logo.height ?? 24} />
          ) : (
            <span
              className="text-xl leading-none text-[var(--md-sys-color-primary)]"
              style={{ fontWeight: "var(--brand-logo-weight)", letterSpacing: "var(--brand-letter-spacing)" }}
            >
              {brand.skin.logo?.text ?? brand.mark}
            </span>
          )}
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
                        className={`md-label-large flex min-h-14 items-center gap-3 rounded-[var(--md-sys-shape-large)] px-3 ${active ? "bg-[var(--brand-nav-active,var(--md-sys-color-primary-container))] text-[var(--brand-on-nav-active,var(--md-sys-color-on-primary-container))]" : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]"}`}
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
          {partnerHeld ? (
            <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
              <h1 className="md-headline-medium">{partnerHeldCopy}</h1>
              <p className="md-body-medium mt-3 text-[var(--md-sys-color-on-surface-variant)]">
                Partners run value sessions with their customers. What reaches you is the funding request and the telemetry.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/home" className="md-button-filled">Back to the portfolio</Link>
              </div>
            </main>
          ) : brandFlow ? <BrandFlowFrame>{children}</BrandFlowFrame> : <main>{children}</main>}
        </div>
      </div>
    </div>
    </div>
  );
}
