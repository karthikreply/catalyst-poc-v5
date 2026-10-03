export type BrandId = "cdw" | "softwareone" | "softchoice";

/**
 * Placeholder skins, approximated from the existing accents.
 * Replace a partner's object when they supply real tokens. No component changes.
 */
export type BrandSkin = {
  colors?: Partial<{
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    topBar: string;
    onTopBar: string;
    navActive: string;
    onNavActive: string;
    focus: string;
  }>;
  type?: {
    fontFamily?: string;
    headingFamily?: string;
    headingWeight?: number;
    bodyWeight?: number;
    letterSpacing?: string;
  };
  shape?: Partial<{ radiusSm: string; radiusMd: string; radiusLg: string; buttonRadius: string }>;
  logo?: { kind: "wordmark" | "image"; text?: string; src?: string; height?: number };
  chrome?: { topBar: "solid" | "light"; rule?: boolean };
};

export type ResolvedSkin = {
  colors: Required<NonNullable<BrandSkin["colors"]>>;
  type: Required<NonNullable<BrandSkin["type"]>>;
  shape: Required<NonNullable<BrandSkin["shape"]>>;
  logo: { kind: "wordmark" | "image"; text?: string; src?: string; height?: number };
  chrome: { topBar: "solid" | "light"; rule: boolean };
};

export type Brand = {
  id: BrandId;
  partnerName: string;
  productName: string;
  mark: string;
  accent: string;
  accentDark: string;
  skin: BrandSkin;
  emailIntro: string;
  artifactIntro: string;
  artifactClosing: string;
  signoff: string;
};

export function withBrandPeople(brand: Brand) {
  return {
    facilitatorOrg: brand.partnerName,
    sponsorLine: `Tom Brennan · ${brand.partnerName} AI & Data Practice Lead`,
    signoff: `Ravi Menon · ${brand.partnerName}`,
  };
}

function channel(value: number) {
  const unit = value / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

export function hexRgb(hex: string) {
  const normalized = hex.trim().replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((part) => part + part).join("") : normalized;
  const value = Number.parseInt(full.slice(0, 6), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
}

export function contrastRatio(foreground: string, background: string) {
  const lum = (hex: string) => {
    const [red, green, blue] = hexRgb(hex);
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
  };
  const lighter = Math.max(lum(foreground), lum(background));
  const darker = Math.min(lum(foreground), lum(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function mix(hex: string, toward: string, amount: number) {
  const from = hexRgb(hex);
  const to = hexRgb(toward);
  const mixed = from.map((part, index) => Math.round(part + (to[index] - part) * amount));
  return `#${mixed.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function readable(background: string, foreground: string, minimum: number) {
  if (contrastRatio(foreground, background) >= minimum) return foreground;
  return contrastRatio("#ffffff", background) >= contrastRatio("#1a1a1a", background) ? "#ffffff" : "#1a1a1a";
}

/** Fills every optional field from the brand accent. Does not repair contrast. */
export function resolveSkin(brand: Pick<Brand, "accent" | "mark" | "skin">): ResolvedSkin {
  const primary = brand.skin.colors?.primary ?? brand.accent;
  const surface = brand.skin.colors?.surface ?? "#fbfbfb";
  const topBarChoice = brand.skin.chrome?.topBar ?? "light";
  const topBar = brand.skin.colors?.topBar ?? (topBarChoice === "solid" ? primary : "#ffffff");
  const primaryContainer = brand.skin.colors?.primaryContainer ?? mix(primary, "#ffffff", 0.86);
  return {
    colors: {
      primary,
      onPrimary: brand.skin.colors?.onPrimary ?? "#ffffff",
      primaryContainer,
      onPrimaryContainer: brand.skin.colors?.onPrimaryContainer ?? mix(primary, "#000000", 0.45),
      surface,
      onSurface: brand.skin.colors?.onSurface ?? "#1c1b1f",
      surfaceVariant: brand.skin.colors?.surfaceVariant ?? mix(surface, "#000000", 0.04),
      onSurfaceVariant: brand.skin.colors?.onSurfaceVariant ?? "#49454f",
      outline: brand.skin.colors?.outline ?? "#79747e",
      topBar,
      onTopBar: brand.skin.colors?.onTopBar ?? (topBarChoice === "solid" ? "#ffffff" : primary),
      navActive: brand.skin.colors?.navActive ?? primaryContainer,
      onNavActive: brand.skin.colors?.onNavActive ?? mix(primary, "#000000", 0.45),
      focus: brand.skin.colors?.focus ?? primary,
    },
    type: {
      fontFamily: brand.skin.type?.fontFamily ?? "Arial, Helvetica, sans-serif",
      headingFamily: brand.skin.type?.headingFamily ?? brand.skin.type?.fontFamily ?? "Arial, Helvetica, sans-serif",
      headingWeight: brand.skin.type?.headingWeight ?? 700,
      bodyWeight: brand.skin.type?.bodyWeight ?? 400,
      letterSpacing: brand.skin.type?.letterSpacing ?? "-0.04em",
    },
    shape: {
      radiusSm: brand.skin.shape?.radiusSm ?? "4px",
      radiusMd: brand.skin.shape?.radiusMd ?? "8px",
      radiusLg: brand.skin.shape?.radiusLg ?? "12px",
      buttonRadius: brand.skin.shape?.buttonRadius ?? "4px",
    },
    logo: {
      kind: brand.skin.logo?.kind ?? "wordmark",
      text: brand.skin.logo?.text ?? brand.mark,
      src: brand.skin.logo?.src,
      height: brand.skin.logo?.height,
    },
    chrome: { topBar: topBarChoice, rule: brand.skin.chrome?.rule ?? false },
  };
}

/** Repairs on* text, the focus ring and the outline. Primary is left as supplied. */
export function ensureReadable(skin: ResolvedSkin): ResolvedSkin {
  const colors = { ...skin.colors };
  colors.onPrimary = readable(colors.primary, colors.onPrimary, 4.5);
  colors.onPrimaryContainer = readable(colors.primaryContainer, colors.onPrimaryContainer, 4.5);
  colors.onSurface = readable(colors.surface, colors.onSurface, 4.5);
  colors.onSurfaceVariant = readable(colors.surfaceVariant, colors.onSurfaceVariant, 4.5);
  colors.onTopBar = readable(colors.topBar, colors.onTopBar, 4.5);
  colors.onNavActive = readable(colors.navActive, colors.onNavActive, 4.5);
  if (contrastRatio(colors.focus, colors.surface) < 3) {
    colors.focus = contrastRatio(colors.primary, colors.surface) >= 3 ? colors.primary : readable(colors.surface, "#ffffff", 3);
  }
  if (contrastRatio(colors.outline, colors.surface) < 3) colors.outline = "#5c5c5c";
  return { ...skin, colors };
}

/** CSS custom properties for one skin. Spread onto the shell root. */
export function skinToCssVars(brand: Pick<Brand, "accent" | "accentDark" | "mark" | "skin">): Record<string, string> {
  const skin = ensureReadable(resolveSkin(brand));
  return {
    "--md-sys-color-primary": skin.colors.primary,
    "--md-sys-color-on-primary": skin.colors.onPrimary,
    "--md-sys-color-primary-container": skin.colors.primaryContainer,
    "--md-sys-color-on-primary-container": skin.colors.onPrimaryContainer,
    "--md-sys-color-surface": skin.colors.surface,
    "--md-sys-color-on-surface": skin.colors.onSurface,
    "--md-sys-color-surface-container": skin.colors.surfaceVariant,
    "--md-sys-color-on-surface-variant": skin.colors.onSurfaceVariant,
    "--md-sys-color-surface-container-high": mix(skin.colors.surfaceVariant, "#000000", 0.04),
    "--md-sys-color-outline": skin.colors.outline,
    "--md-sys-color-outline-variant": mix(skin.colors.outline, "#ffffff", 0.55),
    "--md-sys-shape-small": skin.shape.radiusSm,
    "--md-sys-shape-medium": skin.shape.radiusMd,
    "--md-sys-shape-large": skin.shape.radiusLg,
    "--md-sys-shape-full": skin.shape.buttonRadius,
    "--md-sys-font": skin.type.fontFamily,
    "--brand-heading-font": skin.type.headingFamily,
    "--brand-heading-weight": String(skin.type.headingWeight),
    "--brand-letter-spacing": skin.type.letterSpacing,
    "--brand-accent": skin.colors.primary,
    "--brand-accent-dark": brand.accentDark,
    "--brand-top-bar": skin.colors.topBar,
    "--brand-on-top-bar": skin.colors.onTopBar,
    "--brand-top-rule": skin.chrome.rule ? skin.colors.primary : "transparent",
    "--brand-nav-active": skin.colors.navActive,
    "--brand-on-nav-active": skin.colors.onNavActive,
    "--brand-focus": skin.colors.focus,
    "--brand-logo-weight": String(skin.type.headingWeight),
  };
}

const cdwSkin: BrandSkin = {
  colors: { primary: "#cc1827" },
  type: { fontFamily: "Arial, Helvetica, sans-serif", letterSpacing: "-0.08em", headingWeight: 900 },
  shape: { radiusSm: "2px", radiusMd: "4px", radiusLg: "6px", buttonRadius: "4px" },
  logo: { kind: "wordmark", text: "CDW" },
  chrome: { topBar: "light", rule: true },
};

const softwareoneSkin: BrandSkin = {
  colors: { primary: "#c84318" },
  type: { fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif', letterSpacing: "-0.06em", headingWeight: 800 },
  shape: { radiusSm: "8px", radiusMd: "12px", radiusLg: "16px", buttonRadius: "9999px" },
  logo: { kind: "wordmark", text: "softwareone" },
  chrome: { topBar: "light" },
};

const softchoiceSkin: BrandSkin = {
  colors: { primary: "#6f2cff" },
  type: { fontFamily: '"Segoe UI", Roboto, Arial, sans-serif', letterSpacing: "-0.05em", headingWeight: 800 },
  shape: { radiusSm: "6px", radiusMd: "10px", radiusLg: "14px", buttonRadius: "9999px" },
  logo: { kind: "wordmark", text: "softchoice" },
  chrome: { topBar: "light" },
};

export const brands: Record<BrandId, Brand> = {
  cdw: {
    id: "cdw",
    partnerName: "CDW",
    productName: "Value session",
    mark: "CDW",
    accent: "#cc1827",
    accentDark: "#a70f1c",
    skin: cdwSkin,
    emailIntro: "We’ll keep the session practical and grounded in Heartland’s operating reality.",
    artifactIntro: "Prepared by CDW with Heartland Mutual Insurance",
    artifactClosing: "CDW will carry the evidence into the hackathon booking and keep Heartland’s operating team in control of the next step.",
    signoff: "Ravi Menon · CDW",
  },
  softwareone: {
    id: "softwareone",
    partnerName: "SoftwareOne",
    productName: "Value session",
    mark: "softwareone",
    accent: "#c84318",
    accentDark: "#a5340f",
    skin: softwareoneSkin,
    emailIntro: "Together, we’ll turn Heartland’s operational friction into a focused, measurable pilot.",
    artifactIntro: "A SoftwareOne Value Lab brief for Heartland Mutual Insurance",
    artifactClosing: "SoftwareOne will turn this evidence into a dated hackathon while Heartland retains ownership of the operating decision.",
    signoff: "Ravi Menon · SoftwareOne",
  },
  softchoice: {
    id: "softchoice",
    partnerName: "Softchoice",
    productName: "Value session",
    mark: "softchoice",
    accent: "#6f2cff",
    accentDark: "#5420c7",
    skin: softchoiceSkin,
    emailIntro: "We’ll make the case practical, measurable, and ready for a customer-owned pilot decision.",
    artifactIntro: "A Softchoice business case prepared with Heartland Mutual Insurance",
    artifactClosing: "Softchoice will help Heartland validate the evidence in a three-day hackathon before either team treats the estimate as proved value.",
    signoff: "Ravi Menon · Softchoice",
  },
};
